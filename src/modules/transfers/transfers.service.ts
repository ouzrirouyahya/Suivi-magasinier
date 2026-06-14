import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Article, Mouvement, Transfert, MouvementItem } from '../../types';
import { firestoreRepository } from '../../infrastructure/firestore/FirestoreRepository';
import { useTransfersStore } from './transfers.store';
import { useArticlesStore } from '../articles/articles.store';
import { useSystemStore } from '../system/system.store';
import { validateTransferInvariants, validateCompleteTransferInvariants } from '../../core/BusinessStateValidator';
import { generateSecureUUID, cleanObject } from '../../lib/utils';
import { toast } from 'sonner';

export class TransfersService {
  /**
   * Submit inter-site transfer
   */
  async addTransfert(transfert: Transfert, isSimulation: boolean = false): Promise<void> {
    const tid = transfert.id || generateSecureUUID();
    transfert.id = tid;

    const { articles } = useArticlesStore.getState();

    // Validate
    const validation = validateTransferInvariants(transfert, articles);
    if (!validation.isValid) {
      throw new Error(`INVARIANT_VIOLATION: ${validation.errorMsg}`);
    }

    if (isSimulation) {
      // Reduce local stock at source site
      const updatedArticles = [...articles];
      transfert.items.forEach(item => {
        const index = updatedArticles.findIndex(a => a.id === item.articleId);
        if (index !== -1) {
          const art = updatedArticles[index];
          updatedArticles[index] = { ...art, quantity: Math.max(0, art.quantity - item.quantity) };
        }
      });

      useArticlesStore.getState().setArticles(updatedArticles);
      useTransfersStore.getState().addTransfertLocal({
        ...transfert,
        dateEnvoi: new Date().toISOString()
      });
      return;
    }

    // Run transaction
    await firestoreRepository.runTransactionBlock(async (transaction) => {
      // Deduplicate
      const transferRef = doc(db, 'transferts', tid);
      const transferSnap = await transaction.get(transferRef);
      if (transferSnap.exists()) {
        throw new Error("TRANSFERT_DEJA_TRAITE");
      }

      // Check stock and update source articles
      let totalValue = 0;
      const articleUpdates: { ref: any, newQty: number }[] = [];

      for (const item of transfert.items) {
        const articleRef = doc(db, 'articles', item.articleId);
        const articleSnap = await transaction.get(articleRef);
        if (!articleSnap.exists()) {
          throw new Error("ARTICLE_INTROUVABLE");
        }

        const article = articleSnap.data() as Article;
        totalValue += item.quantity * (article.price || 0);

        const newQty = article.quantity - item.quantity;
        if (newQty < 0) {
          throw new Error("STOCK_INSUFFISANT");
        }

        articleUpdates.push({ ref: articleRef, newQty });
      }

      // Write updates
      for (const update of articleUpdates) {
        transaction.update(update.ref, { quantity: update.newQty });
      }

      // Write outbound transfer log
      const outboundMvtId = generateSecureUUID();
      const outboundMvtRef = doc(db, 'mouvements', outboundMvtId);
      transaction.set(outboundMvtRef, cleanObject({
        id: outboundMvtId,
        site: transfert.sourceSite,
        date: new Date().toISOString(),
        type: 'TRANSFERT_OUT',
        reference: transfert.reference,
        targetSite: transfert.targetSite,
        items: transfert.items.map(i => ({ articleId: i.articleId, quantity: i.quantity, price: i.price || 0 })),
        notes: `Expédition de transfert réf: ${transfert.reference} vers ${transfert.targetSite}`,
        status: 'EN_TRANSIT'
      }));

      // Write transfer document
      transaction.set(transferRef, cleanObject({
        ...transfert,
        id: tid,
        dateEnvoi: serverTimestamp()
      }));

      // Audit logs
      const auditLogId = generateSecureUUID();
      const auditLogRef = doc(db, 'auditLogs', auditLogId);
      transaction.set(auditLogRef, cleanObject({
        id: auditLogId,
        timestamp: new Date().toISOString(),
        userEmail: transfert.expediteur,
        site: transfert.sourceSite,
        action: 'TRANSFERT_OUT',
        details: `Transfert ${transfert.reference} vers ${transfert.targetSite}`,
        amount: totalValue
      }));
    });

    useTransfersStore.getState().addTransfertLocal(transfert);
  }

  /**
   * Complete inter-site transfer (Receipt)
   */
  async completeTransfert(
    id: string,
    recepteur: string,
    receivedItems?: MouvementItem[],
    disputeReason?: string,
    isSimulation: boolean = false
  ): Promise<void> {
    const { transferts } = useTransfersStore.getState();
    const { articles } = useArticlesStore.getState();

    const validation = validateCompleteTransferInvariants(id, recepteur, transferts);
    if (!validation.isValid) {
      throw new Error(`INVARIANT_VIOLATION: ${validation.errorMsg}`);
    }

    if (isSimulation) {
      const updatedTransferts = [...transferts];
      const tIndex = updatedTransferts.findIndex(tx => tx.id === id);
      if (tIndex !== -1) {
        const tx = updatedTransferts[tIndex];
        updatedTransferts[tIndex] = { ...tx, status: 'RECEIVED', recepteur, receivedItems, disputeReason };

        const updatedArticles = [...articles];
        const finalReceivedItems = receivedItems || tx.items;
        
        finalReceivedItems.forEach((item) => {
          const index = updatedArticles.findIndex(a => a.id === item.articleId);
          if (index !== -1) {
            const art = updatedArticles[index];
            updatedArticles[index] = { ...art, quantity: art.quantity + item.quantity };
          }
        });
        
        useArticlesStore.getState().setArticles(updatedArticles);
        useTransfersStore.getState().setTransferts(updatedTransferts);
      }
      return;
    }

    await firestoreRepository.runTransactionBlock(async (transaction) => {
      const tRef = doc(db, 'transferts', id);
      const tSnap = await transaction.get(tRef);
      if (!tSnap.exists()) {
        throw new Error("TRANSFERT_INTROUVABLE");
      }
      const transfert = tSnap.data() as Transfert;

      if (transfert.status === 'RECEIVED' || transfert.status === 'CLOSED' || transfert.status === 'RECU') {
        throw new Error("TRANSFERT_DEJA_RECEPTIONNE");
      }

      let isDivergent = false;
      const finalReceivedItems = receivedItems || transfert.items;

      transfert.items.forEach((sentItem) => {
        const recItem = finalReceivedItems.find(r => r.articleId === sentItem.articleId);
        if (!recItem || recItem.quantity !== sentItem.quantity) {
          isDivergent = true;
        }
      });

      if (disputeReason) {
        isDivergent = true;
      }

      const targetArticleWork: any[] = [];
      let totalValue = 0;

      for (const item of finalReceivedItems) {
        const sourceArticleRef = doc(db, 'articles', item.articleId);
        const sourceArticleSnap = await transaction.get(sourceArticleRef);
        if (!sourceArticleSnap.exists()) {
          throw new Error("ARTICLE_INTROUVABLE");
        }
        const sourceArticle = sourceArticleSnap.data() as Article;

        const targetDeterministicId = `${transfert.targetSite}_${sourceArticle.ref.trim().toUpperCase().replace(/\s+/g, '_')}`;
        const targetArticleRef = doc(db, 'articles', targetDeterministicId);
        const targetArticleSnap = await transaction.get(targetArticleRef);

        let exists = false;
        let currentQty = 0;
        if (targetArticleSnap.exists()) {
          exists = true;
          const targetArticle = targetArticleSnap.data() as Article;
          currentQty = targetArticle.quantity;
        }

        totalValue += item.quantity * (item.price || 0);

        targetArticleWork.push({
          ref: targetArticleRef,
          exists,
          currentQty,
          newQty: currentQty + item.quantity,
          sourceArticle,
          deterministicId: targetDeterministicId,
          transferItem: item
        });
      }

      for (const work of targetArticleWork) {
        if (work.exists) {
          transaction.update(work.ref, {
            quantity: work.newQty,
            active: true
          });
        } else {
          const newArticle: Article = {
            id: work.deterministicId,
            site: transfert.targetSite,
            ref: work.sourceArticle.ref,
            designation: work.sourceArticle.designation,
            type: work.sourceArticle.type,
            category: work.sourceArticle.category,
            functionalCategory: work.sourceArticle.functionalCategory || '',
            subCategory: work.sourceArticle.subCategory || '',
            component: work.sourceArticle.component || '',
            subComponent: work.sourceArticle.subComponent || '',
            unit: work.sourceArticle.unit,
            quantity: work.transferItem.quantity,
            minStock: work.sourceArticle.minStock || 0,
            location: 'A affecter',
            price: work.sourceArticle.price || 0,
            active: true,
            notes: `Créé par transfert depuis ${transfert.sourceSite}`
          };
          transaction.set(work.ref, cleanObject(newArticle));
        }

        // Create entry movement log on target site
        const inboundMovementId = generateSecureUUID();
        const inboundMovementRef = doc(db, 'mouvements', inboundMovementId);
        transaction.set(inboundMovementRef, cleanObject({
          id: inboundMovementId,
          site: transfert.targetSite,
          date: new Date().toISOString(),
          type: 'TRANSFERT_IN',
          reference: transfert.reference,
          items: [{
            articleId: work.deterministicId,
            quantity: work.transferItem.quantity,
            price: work.transferItem.price || 0
          }],
          notes: `Réception de transfert réf: ${transfert.reference} de ${transfert.sourceSite}${isDivergent ? ' [AVEC DIVERGENCE SIGNE]' : ''}`,
          status: 'COMPLETE'
        }));
      }

      const nextStatus = isDivergent ? 'DISPUTED' : 'RECEIVED';
      transaction.update(tRef, {
        status: nextStatus,
        dateReception: serverTimestamp(),
        recepteur,
        receivedItems: finalReceivedItems,
        disputeReason: disputeReason || (isDivergent ? "Quantités reçues non conformes au bon d'expédition." : '')
      });

      // Audit Log
      const auditId = generateSecureUUID();
      const auditLogRef = doc(db, 'auditLogs', auditId);
      transaction.set(auditLogRef, cleanObject({
        id: auditId,
        timestamp: new Date().toISOString(),
        userEmail: recepteur,
        site: transfert.targetSite,
        action: 'TRANSFERT_IN',
        details: `Transfert ${transfert.reference} réceptionné [${nextStatus}]`,
        amount: totalValue
      }));

      // Forensic Anomaly trigger if divergent
      if (isDivergent) {
        const anomalyId = generateSecureUUID();
        const anomalyRef = doc(db, 'anomalyReports', anomalyId);
        transaction.set(anomalyRef, cleanObject({
          id: anomalyId,
          site: transfert.targetSite,
          timestamp: serverTimestamp(),
          type: 'STOCK_INCOHERENCE',
          severity: 'HIGH',
          description: `DIVERGENCE LOGISTIQUE INTER-SITES: Le transfert ${transfert.reference} de ${transfert.sourceSite} comporte des écarts de réception enregistrés par ${recepteur}.`,
          status: 'NEW',
          suggestedAction: "Déclencher un inventaire contradictoire du sas et ajuster les écarts."
        }));
      }
    });

    useTransfersStore.getState().updateTransfertLocal(id, {
      status: disputeReason ? 'DISPUTED' : 'RECEIVED',
      recepteur,
      receivedItems,
      disputeReason
    });
  }

  /**
   * Approve a Transfert
   */
  async approveTransfert(id: string, approver: string, isSimulation: boolean = false): Promise<void> {
    if (isSimulation) {
      useTransfersStore.getState().updateTransfertLocal(id, { status: 'IN_TRANSIT' });
      return;
    }

    await firestoreRepository.update('transferts', id, {
      status: 'IN_TRANSIT',
      expediteur: approver
    });

    useTransfersStore.getState().updateTransfertLocal(id, {
      status: 'IN_TRANSIT',
      expediteur: approver
    });
  }

  /**
   * Close a transfer with justification
   */
  async closeTransfert(id: string, reason: string, isSimulation: boolean = false): Promise<void> {
    if (isSimulation) {
      useTransfersStore.getState().updateTransfertLocal(id, { status: 'CLOSED', disputeReason: reason });
      return;
    }

    await firestoreRepository.update('transferts', id, {
      status: 'CLOSED',
      disputeReason: reason
    });

    useTransfersStore.getState().updateTransfertLocal(id, {
      status: 'CLOSED',
      disputeReason: reason
    });
  }
}

export const transfersService = new TransfersService();
