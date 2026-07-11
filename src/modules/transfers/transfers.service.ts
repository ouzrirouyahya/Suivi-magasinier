import { doc, runTransaction, db } from '../../lib/db';
import { Article, Transfert, MouvementItem, TransfertHistoryEntry } from '../../types';
import { firestoreRepository } from '../../infrastructure/firestore/FirestoreRepository';
import { useTransfersStore } from './transfers.store';
import { useArticlesStore } from '../articles/articles.store';
import { validateTransferInvariants, validateCompleteTransferInvariants } from '../../core/BusinessStateValidator';
import { generateSecureUUID, cleanObject, logger } from '../../lib/utils';

const sanitizeForFirestoreId = (str: string): string => {
  return str
    .trim()
    .toUpperCase()
    .replace(/\//g, '-')           // slash → tiret
    .replace(/\./g, '_')           // point → underscore
    .replace(/[\[\]\*\`~\(\)]/g, '') // supprimer les chars interdits
    .replace(/\s+/g, '_')          // espaces → underscore
    .replace(/_{2,}/g, '_')        // double underscore → simple
    .replace(/^_|_$/g, '')         // supprimer underscore en début/fin
    .slice(0, 100);                 // max 100 chars
};

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
        logger.error('[addTransfert (Simulation)] Erreur:', error);
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
          status: 'VALIDE'
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
      logger.error('[addTransfert] Transaction échouée:', error);
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
        logger.error('[completeTransfert (Simulation)] Erreur:', error);
        return { success: false, error: error.message || 'Erreur lors de la simulation de réception' };
      }
    }

    try {
      const localArticlesToUpdate: { id: string; quantity: number; newArticle?: Article }[] = [];
      let isDivergent = false;
      let finalReceivedItems: MouvementItem[] = [];

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

        finalReceivedItems = receivedItems || transfert.items;

        transfert.items.forEach((sentItem) => {
          const recItem = finalReceivedItems.find(r => r.articleId === sentItem.articleId);
          const receivedQty = recItem?.quantityReceived ?? recItem?.quantity ?? 0;
          if (!recItem || receivedQty !== sentItem.quantity) {
            isDivergent = true;
          }
        });

        if (disputeReason) {
          isDivergent = true;
        }

        const targetArticleWork: (any & { actualReceivedQty: number })[] = [];
        let totalValue = 0;

        for (const item of finalReceivedItems) {
          const actualReceivedQty = item.quantityReceived ?? item.quantity;
          
          // Ignorer les items où RIEN n'a été reçu (0 unité)
          if (actualReceivedQty <= 0) continue;

          const sourceArticleRef = doc(db, 'articles', item.articleId);
          const sourceArticleSnap = await transaction.get(sourceArticleRef);
          if (!sourceArticleSnap.exists()) {
            throw new Error("ARTICLE_INTROUVABLE");
          }
          const sourceArticle = sourceArticleSnap.data() as Article;

          const targetDeterministicId = `${transfert.targetSite}_${sanitizeForFirestoreId(sourceArticle.ref)}`;
          const targetArticleRef = doc(db, 'articles', targetDeterministicId);
          const targetArticleSnap = await transaction.get(targetArticleRef);

          let exists = false;
          let currentQty = 0;
          if (targetArticleSnap.exists()) {
            exists = true;
            const targetArticle = targetArticleSnap.data() as Article;
            currentQty = targetArticle.quantity;
          }

          totalValue += actualReceivedQty * (item.price || 0);  // ← quantité réelle

          targetArticleWork.push({
            ref: targetArticleRef,
            exists,
            currentQty,
            newQty: currentQty + actualReceivedQty,  // ← FIX : quantité réellement reçue
            sourceArticle,
            deterministicId: targetDeterministicId,
            transferItem: item,
            actualReceivedQty  // ← stocker pour usage plus bas
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
              quantity: work.actualReceivedQty,  // ← FIX : quantité réellement reçue
              minStock: work.sourceArticle.minStock || 0,
              location: 'A affecter',
              price: work.sourceArticle.price || 0,
              active: true,
              notes: `Créé par transfert depuis ${transfert.sourceSite}`
            };
            transaction.set(work.ref, cleanObject(newArticle));
            localArticlesToUpdate.push({ id: work.deterministicId, quantity: work.actualReceivedQty, newArticle });
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
            createdBy: recepteur,
            items: [{
              articleId: work.deterministicId,
              quantity: work.actualReceivedQty,  // ← FIX : quantité réellement reçue
              price: work.transferItem.price || 0
            }],
            notes: `Réception de transfert réf: ${transfert.reference} de ${transfert.sourceSite}` +
              (isDivergent ? ` [DIVERGENCE : ${work.transferItem.quantity} envoyé(s), ${work.actualReceivedQty} reçu(s)]` : ''),
            status: 'VALIDE'
          }));
        }

        const nextStatus = isDivergent ? 'DISPUTED' : 'RECEIVED';
        const finalDisputeReason = disputeReason || (isDivergent ? "Quantités reçues non conformes au bon d'expédition." : '');
        const historyEntry: TransfertHistoryEntry = {
          status: nextStatus,
          date: new Date().toISOString(),
          userEmail: recepteur,
          comment: finalDisputeReason || 'Réception confirmée sans divergence'
        };

        transaction.update(tRef, {
          status: nextStatus,
          dateReception: new Date().toISOString(),
          recepteur,
          receivedItems: finalReceivedItems,
          disputeReason: finalDisputeReason,
          history: [...(transfert.history || []), historyEntry]
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

      const nextStatus = isDivergent ? 'DISPUTED' : 'RECEIVED';
      const finalDisputeReason = disputeReason || (isDivergent ? "Quantités reçues non conformes au bon d'expédition." : '');
      const t = useTransfersStore.getState().transferts.find(tx => tx.id === id);
      const historyEntry: TransfertHistoryEntry = {
        status: nextStatus,
        date: new Date().toISOString(),
        userEmail: recepteur,
        comment: finalDisputeReason || 'Réception confirmée sans divergence'
      };

      useTransfersStore.getState().updateTransfertLocal(id, {
        status: nextStatus,
        recepteur,
        receivedItems: finalReceivedItems,
        disputeReason: finalDisputeReason,
        history: t ? [...(t.history || []), historyEntry] : [historyEntry]
      });

      return { success: true };
    } catch (error: any) {
      logger.error('[completeTransfert] Transaction échouée:', error);
      return { success: false, error: error.message || 'Erreur lors de la réception du transfert' };
    }
  }

  /**
   * Approve a Transfert (transitions PENDING_APPROVAL -> APPROUVE)
   */
  async approveTransfert(id: string, approver: string, comment?: string, isSimulation: boolean = false): Promise<{ success: boolean; error?: string }> {
    try {
      const historyEntry: TransfertHistoryEntry = {
        status: 'APPROUVE',
        date: new Date().toISOString(),
        userEmail: approver,
        comment: comment || 'Bordereau approuvé'
      };

      if (isSimulation) {
        const t = useTransfersStore.getState().transferts.find(tx => tx.id === id);
        const updatedHistory = t ? [...(t.history || []), historyEntry] : [historyEntry];
        useTransfersStore.getState().updateTransfertLocal(id, { 
          status: 'APPROUVE',
          history: updatedHistory
        });
        return { success: true };
      }

      const tRef = doc(db, 'transferts', id);
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(tRef);
        if (!snap.exists()) throw new Error("TRANSFERT_INTROUVABLE");
        const t = snap.data() as Transfert;
        const updatedHistory = [...(t.history || []), historyEntry];
        transaction.update(tRef, {
          status: 'APPROUVE',
          history: updatedHistory
        });
      });

      const t = useTransfersStore.getState().transferts.find(tx => tx.id === id);
      const updatedHistory = t ? [...(t.history || []), historyEntry] : [historyEntry];
      useTransfersStore.getState().updateTransfertLocal(id, {
        status: 'APPROUVE',
        history: updatedHistory
      });
      return { success: true };
    } catch (error: any) {
      logger.error('[approveTransfert] Erreur:', error);
      return { success: false, error: error.message || 'Erreur lors de l\'approbation du transfert' };
    }
  }

  /**
   * Ship/expedite a transfer (transitions APPROUVE -> IN_TRANSIT)
   */
  async expedierTransfert(id: string, expediteur: string, comment?: string, isSimulation: boolean = false): Promise<{ success: boolean; error?: string }> {
    try {
      const historyEntry: TransfertHistoryEntry = {
        status: 'IN_TRANSIT',
        date: new Date().toISOString(),
        userEmail: expediteur,
        comment: comment || 'Convoi expédié'
      };

      if (isSimulation) {
        const t = useTransfersStore.getState().transferts.find(tx => tx.id === id);
        const updatedHistory = t ? [...(t.history || []), historyEntry] : [historyEntry];
        useTransfersStore.getState().updateTransfertLocal(id, { 
          status: 'IN_TRANSIT',
          expediteur,
          history: updatedHistory
        });
        return { success: true };
      }

      const tRef = doc(db, 'transferts', id);
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(tRef);
        if (!snap.exists()) throw new Error("TRANSFERT_INTROUVABLE");
        const t = snap.data() as Transfert;
        const updatedHistory = [...(t.history || []), historyEntry];
        transaction.update(tRef, {
          status: 'IN_TRANSIT',
          expediteur,
          history: updatedHistory
        });
      });

      const t = useTransfersStore.getState().transferts.find(tx => tx.id === id);
      const updatedHistory = t ? [...(t.history || []), historyEntry] : [historyEntry];
      useTransfersStore.getState().updateTransfertLocal(id, {
        status: 'IN_TRANSIT',
        expediteur,
        history: updatedHistory
      });
      return { success: true };
    } catch (error: any) {
      logger.error('[expedierTransfert] Erreur:', error);
      return { success: false, error: error.message || 'Erreur lors de l\'expédition du transfert' };
    }
  }

  /**
   * Close a transfer with justification (transitions RECEIVED/DISPUTED -> CLOSED)
   */
  async closeTransfert(id: string, reason: string, isSimulation: boolean = false): Promise<{ success: boolean; error?: string }> {
    try {
      const historyEntry: TransfertHistoryEntry = {
        status: 'CLOSED',
        date: new Date().toISOString(),
        userEmail: 'Système/Comptabilité',
        comment: reason || 'Clôture du convoi inter-sites'
      };

      if (isSimulation) {
        const t = useTransfersStore.getState().transferts.find(tx => tx.id === id);
        const updatedHistory = t ? [...(t.history || []), historyEntry] : [historyEntry];
        useTransfersStore.getState().updateTransfertLocal(id, { 
          status: 'CLOSED', 
          disputeReason: reason,
          history: updatedHistory
        });
        return { success: true };
      }

      const tRef = doc(db, 'transferts', id);
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(tRef);
        if (!snap.exists()) throw new Error("TRANSFERT_INTROUVABLE");
        const t = snap.data() as Transfert;
        const updatedHistory = [...(t.history || []), historyEntry];
        transaction.update(tRef, {
          status: 'CLOSED',
          disputeReason: reason,
          history: updatedHistory
        });
      });

      const t = useTransfersStore.getState().transferts.find(tx => tx.id === id);
      const updatedHistory = t ? [...(t.history || []), historyEntry] : [historyEntry];
      useTransfersStore.getState().updateTransfertLocal(id, {
        status: 'CLOSED',
        disputeReason: reason,
        history: updatedHistory
      });
      return { success: true };
    } catch (error: any) {
      logger.error('[closeTransfert] Erreur:', error);
      return { success: false, error: error.message || 'Erreur lors de la clôture du transfert' };
    }
  }
}

export const transfersService = new TransfersService();
