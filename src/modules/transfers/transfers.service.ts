import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Article, Transfert, MouvementItem } from '../../types';
import { firestoreRepository } from '../../infrastructure/firestore/FirestoreRepository';
import { useTransfersStore } from './transfers.store';
import { useArticlesStore } from '../articles/articles.store';
import { validateTransferInvariants, validateCompleteTransferInvariants } from '../../core/BusinessStateValidator';
import { generateSecureUUID, cleanObject } from '../../lib/utils';

export class TransfersService {
  /**
   * Submit inter-site transfer
   */
  async addTransfert(transfert: Transfert, isSimulation: boolean = false): Promise<{ success: boolean; error?: string }> {
    const tid = transfert.id || generateSecureUUID();
    transfert.id = tid;

    const { articles } = useArticlesStore.getState();

    // Validate
    const validation = validateTransferInvariants(transfert, articles);
    if (!validation.isValid) {
      return { success: false, error: `Violation des règles métier : ${validation.errorMsg}` };
    }

    if (isSimulation) {
      try {
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
        return { success: true };
      } catch (error: any) {
        console.error('[addTransfert (Simulation)] Erreur:', error);
        return { success: false, error: error.message || 'Erreur lors de la simulation' };
      }
    }

    // Run transaction
    try {
      const localArticlesToUpdate: { id: string; quantity: number }[] = [];

      await runTransaction(db, async (transaction) => {
        // Deduplicate
        const transferRef = doc(db, 'transferts', tid);
        const transferSnap = await transaction.get(transferRef);
        if (transferSnap.exists()) {
          throw new Error("TRANSFERT_DEJA_TRAITE");
        }

        // Check stock and update source articles
        let totalValue = 0;
        const articleUpdates: { id: string; ref: any; newQty: number }[] = [];

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
            throw new Error(`Stock insuffisant pour l'article ${article.ref}. Disponible: ${article.quantity}, Demandé: ${item.quantity}`);
          }

          articleUpdates.push({ id: item.articleId, ref: articleRef, newQty });
        }

        // Write updates
        for (const update of articleUpdates) {
          transaction.update(update.ref, { quantity: update.newQty });
          localArticlesToUpdate.push({ id: update.id, quantity: update.newQty });
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
          dateEnvoi: new Date().toISOString()
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

      // Update stores locally ONLY on success
      localArticlesToUpdate.forEach(upd => {
        useArticlesStore.getState().updateArticleLocal(upd.id, { quantity: upd.quantity });
      });
      useTransfersStore.getState().addTransfertLocal(transfert);

      return { success: true };
    } catch (error: any) {
      console.error('[addTransfert] Transaction échouée:', error);
      return { success: false, error: error.message || 'Erreur lors du transfert' };
    }
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
  ): Promise<{ success: boolean; error?: string }> {
    const { transferts } = useTransfersStore.getState();
    const { articles } = useArticlesStore.getState();

    const validation = validateCompleteTransferInvariants(id, recepteur, transferts);
    if (!validation.isValid) {
      return { success: false, error: `Violation des règles métier : ${validation.errorMsg}` };
    }

    if (isSimulation) {
      try {
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
        return { success: true };
      } catch (error: any) {
        console.error('[completeTransfert (Simulation)] Erreur:', error);
        return { success: false, error: error.message || 'Erreur lors de la simulation de réception' };
      }
    }

    try {
      const localArticlesToUpdate: { id: string; quantity: number; newArticle?: Article }[] = [];

      await runTransaction(db, async (transaction) => {
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
            localArticlesToUpdate.push({ id: work.deterministicId, quantity: work.newQty });
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
            localArticlesToUpdate.push({ id: work.deterministicId, quantity: work.transferItem.quantity, newArticle });
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
          dateReception: new Date().toISOString(),
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
            timestamp: new Date().toISOString(),
            type: 'STOCK_INCOHERENCE',
            severity: 'HIGH',
            description: `DIVERGENCE LOGISTIQUE INTER-SITES: Le transfert ${transfert.reference} de ${transfert.sourceSite} comporte des écarts de réception enregistrés par ${recepteur}.`,
            status: 'NEW',
            suggestedAction: "Déclencher un inventaire contradictoire du sas et ajuster les écarts."
          }));
        }
      });

      // Update local state ONLY on success
      localArticlesToUpdate.forEach(work => {
        if (work.newArticle) {
          useArticlesStore.getState().addArticleLocal(work.newArticle);
        } else {
          useArticlesStore.getState().updateArticleLocal(work.id, { quantity: work.quantity });
        }
      });
      useTransfersStore.getState().updateTransfertLocal(id, {
        status: disputeReason ? 'DISPUTED' : 'RECEIVED',
        recepteur,
        receivedItems,
        disputeReason
      });

      return { success: true };
    } catch (error: any) {
      console.error('[completeTransfert] Transaction échouée:', error);
      return { success: false, error: error.message || 'Erreur lors de la réception du transfert' };
    }
  }

  /**
   * Approve a Transfert
   */
  async approveTransfert(id: string, approver: string, isSimulation: boolean = false): Promise<{ success: boolean; error?: string }> {
    try {
      if (isSimulation) {
        useTransfersStore.getState().updateTransfertLocal(id, { status: 'IN_TRANSIT' });
        return { success: true };
      }

      await firestoreRepository.update('transferts', id, {
        status: 'IN_TRANSIT',
        expediteur: approver
      });

      useTransfersStore.getState().updateTransfertLocal(id, {
        status: 'IN_TRANSIT',
        expediteur: approver
      });
      return { success: true };
    } catch (error: any) {
      console.error('[approveTransfert] Erreur:', error);
      return { success: false, error: error.message || 'Erreur lors de l\'approbation du transfert' };
    }
  }

  /**
   * Close a transfer with justification
   */
  async closeTransfert(id: string, reason: string, isSimulation: boolean = false): Promise<{ success: boolean; error?: string }> {
    try {
      if (isSimulation) {
        useTransfersStore.getState().updateTransfertLocal(id, { status: 'CLOSED', disputeReason: reason });
        return { success: true };
      }

      await firestoreRepository.update('transferts', id, {
        status: 'CLOSED',
        disputeReason: reason
      });

      useTransfersStore.getState().updateTransfertLocal(id, {
        status: 'CLOSED',
        disputeReason: reason
      });
      return { success: true };
    } catch (error: any) {
      console.error('[closeTransfert] Erreur:', error);
      return { success: false, error: error.message || 'Erreur lors de la clôture du transfert' };
    }
  }
}

export const transfersService = new TransfersService();
