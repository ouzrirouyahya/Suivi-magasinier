import { doc, runTransaction, db } from '../../lib/db';
import { Article, Transfert, MouvementItem, TransfertHistoryEntry, Mouvement } from '../../types';
import { firestoreRepository } from '../../infrastructure/firestore/FirestoreRepository';
import { useTransfersStore } from './transfers.store';
import { useArticlesStore } from '../articles/articles.store';
import { useMovementsStore } from '../movements/movements.store';
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
        
        const enrichedTransfert = {
          ...transfert,
          dateEnvoi: new Date().toISOString()
        };
        useTransfersStore.getState().addTransfertLocal(enrichedTransfert);

        // Add local outbound movement for tracking in offline mode
        const localOutboundMvt: Mouvement = {
          id: 'mvt_local_' + generateSecureUUID(),
          site: enrichedTransfert.sourceSite,
          date: enrichedTransfert.dateEnvoi,
          type: 'TRANSFERT_OUT',
          reference: enrichedTransfert.reference,
          targetSite: enrichedTransfert.targetSite,
          items: enrichedTransfert.items.map(item => {
            const sourceArticle = articles.find(a => a.id === item.articleId);
            return {
              articleId: item.articleId,
              quantity: item.quantity,
              price: item.price || 0,
              articleDesignation: sourceArticle?.designation || item.articleDesignation || '',
              articleRef: sourceArticle?.ref || item.articleRef || '',
              articleUnit: sourceArticle?.unit || item.articleUnit || 'PIECE',
            };
          }),
          notes: `Expédition de transfert réf: ${enrichedTransfert.reference} vers ${enrichedTransfert.targetSite}`,
          status: 'VALIDE',
          createdBy: enrichedTransfert.expediteur
        };
        useMovementsStore.getState().addMouvementLocal(localOutboundMvt);

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
        const articleUpdates: { id: string; ref: any; newQty: number; article: Article }[] = [];

        for (const item of transfert.items) {
          const articleRef = doc(db, 'articles', item.articleId);
          
          const existingIndex = articleUpdates.findIndex(u => u.id === item.articleId);
          let currentQty = 0;
          let article: Article;

          if (existingIndex !== -1) {
            currentQty = articleUpdates[existingIndex].newQty;
            article = articleUpdates[existingIndex].article;
          } else {
            const articleSnap = await transaction.get(articleRef);
            if (!articleSnap.exists()) {
              throw new Error("ARTICLE_INTROUVABLE");
            }
            article = articleSnap.data() as Article;
            currentQty = article.quantity || 0;
          }

          totalValue += item.quantity * (article.price || 0);

          const newQty = currentQty - item.quantity;
          if (newQty < 0) {
            throw new Error(`Stock insuffisant pour l'article ${article.ref}. Disponible: ${currentQty}, Demandé: ${item.quantity}`);
          }

          const updateObj = { id: item.articleId, ref: articleRef, newQty, article };
          if (existingIndex !== -1) {
            articleUpdates[existingIndex] = updateObj;
          } else {
            articleUpdates.push(updateObj);
          }
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
          const nextStatus = disputeReason ? 'DISPUTED' : 'RECEIVED';
          updatedTransferts[tIndex] = { ...tx, status: nextStatus, recepteur, receivedItems, disputeReason };

          const updatedArticles = [...articles];
          const finalReceivedItems = receivedItems || tx.items;
          const localMouvementItems: MouvementItem[] = [];
          
          finalReceivedItems.forEach((item) => {
            const actualReceivedQty = item.quantityReceived ?? item.quantity;
            if (actualReceivedQty <= 0) return; // rien reçu → pas de mise à jour stock
            
            // Trouver l'article source localement pour obtenir sa référence
            const sourceArticle = articles.find(a => a.id === item.articleId);
            if (!sourceArticle) {
              logger.warn(`[completeTransfert (Simulation)] Article source introuvable pour ID : ${item.articleId}`);
              return;
            }

            // Calculer l'ID déterministe de destination
            const targetDeterministicId = `${tx.targetSite}_${sanitizeForFirestoreId(sourceArticle.ref)}`;
            const index = updatedArticles.findIndex(a => a.id === targetDeterministicId);
            
            if (index !== -1) {
              const art = updatedArticles[index];
              updatedArticles[index] = { ...art, quantity: art.quantity + actualReceivedQty, active: true };
            } else {
              // Créer l'article sur le site cible s'il n'existe pas localement
              const newArticle: Article = {
                id: targetDeterministicId,
                site: tx.targetSite,
                ref: sourceArticle.ref,
                designation: sourceArticle.designation,
                type: sourceArticle.type,
                category: sourceArticle.category,
                functionalCategory: sourceArticle.functionalCategory || '',
                subCategory: sourceArticle.subCategory || '',
                component: sourceArticle.component || '',
                subComponent: sourceArticle.subComponent || '',
                unit: sourceArticle.unit,
                quantity: actualReceivedQty,
                minStock: sourceArticle.minStock || 0,
                location: 'A affecter',
                price: sourceArticle.price || 0,
                active: true,
                notes: `Créé par transfert depuis ${tx.sourceSite} (Hors-ligne)`
              };
              updatedArticles.push(newArticle);
            }

            localMouvementItems.push({
              articleId: targetDeterministicId,
              quantity: actualReceivedQty,
              price: item.price || sourceArticle.price || 0,
              articleDesignation: sourceArticle.designation,
              articleRef: sourceArticle.ref,
              articleUnit: sourceArticle.unit || 'PIECE'
            });
          });
          
          useArticlesStore.getState().setArticles(updatedArticles);
          useTransfersStore.getState().setTransferts(updatedTransferts);

          // Add local inbound movement for tracking in offline mode
          if (localMouvementItems.length > 0) {
            const localInboundMvt: Mouvement = {
              id: 'mvt_local_' + generateSecureUUID(),
              site: tx.targetSite,
              date: new Date().toISOString(),
              type: 'TRANSFERT_IN',
              reference: tx.reference,
              createdBy: recepteur,
              items: localMouvementItems,
              notes: `Réception de transfert réf: ${tx.reference} de ${tx.sourceSite}` +
                (disputeReason ? ` [DIVERGENCE : ${disputeReason}]` : ''),
              status: 'VALIDE'
            };
            useMovementsStore.getState().addMouvementLocal(localInboundMvt);
          }
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

        const targetArticleWork: (any & { actualReceivedQty: number; sentQty: number })[] = [];
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
          
          const existingWorkIndex = targetArticleWork.findIndex(w => w.deterministicId === targetDeterministicId);
          
          let exists = false;
          let currentQty = 0;
          
          if (existingWorkIndex !== -1) {
            exists = targetArticleWork[existingWorkIndex].exists;
            currentQty = targetArticleWork[existingWorkIndex].newQty;
          } else {
            const targetArticleSnap = await transaction.get(targetArticleRef);
            if (targetArticleSnap.exists()) {
              exists = true;
              const targetArticle = targetArticleSnap.data() as Article;
              currentQty = targetArticle.quantity;
            }
          }

          totalValue += actualReceivedQty * (item.price || 0);  // ← quantité réelle

          const workObj = {
            ref: targetArticleRef,
            exists,
            currentQty: existingWorkIndex !== -1 ? targetArticleWork[existingWorkIndex].currentQty : currentQty,
            newQty: currentQty + actualReceivedQty,
            sourceArticle,
            deterministicId: targetDeterministicId,
            transferItem: item,
            actualReceivedQty: (existingWorkIndex !== -1 ? targetArticleWork[existingWorkIndex].actualReceivedQty : 0) + actualReceivedQty,
            sentQty: (existingWorkIndex !== -1 ? targetArticleWork[existingWorkIndex].sentQty : 0) + item.quantity
          };

          if (existingWorkIndex !== -1) {
            targetArticleWork[existingWorkIndex] = workObj;
          } else {
            targetArticleWork.push(workObj);
          }
        }

        const inboundMouvementItems: MouvementItem[] = [];

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

          inboundMouvementItems.push({
            articleId: work.deterministicId,
            quantity: work.actualReceivedQty,  // ← FIX : quantité réellement reçue
            price: work.transferItem.price || work.sourceArticle.price || 0,
            articleDesignation: work.sourceArticle.designation,
            articleRef: work.sourceArticle.ref,
            articleUnit: work.sourceArticle.unit || 'PIECE'
          });
        }

        // Create a single consolidated TRANSFERT_IN movement log on target site
        if (inboundMouvementItems.length > 0) {
          const inboundMovementId = generateSecureUUID();
          const inboundMovementRef = doc(db, 'mouvements', inboundMovementId);
          
          let divergenceSummary = '';
          if (isDivergent) {
            const divergenceDetails = targetArticleWork
              .filter(w => w.sentQty !== w.actualReceivedQty)
              .map(w => `${w.sourceArticle.ref}: ${w.sentQty} envoyé(s), ${w.actualReceivedQty} reçu(s)`)
              .join(', ');
            divergenceSummary = divergenceDetails ? ` [DIVERGENCE : ${divergenceDetails}]` : ' [DIVERGENCE détectée]';
          }

          transaction.set(inboundMovementRef, cleanObject({
            id: inboundMovementId,
            site: transfert.targetSite,
            date: new Date().toISOString(),
            type: 'TRANSFERT_IN',
            reference: transfert.reference,
            createdBy: recepteur,
            items: inboundMouvementItems,
            notes: `Réception de transfert réf: ${transfert.reference} de ${transfert.sourceSite}${divergenceSummary}`,
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
        if (t && t.status !== 'PENDING_APPROVAL') {
          return {
            success: false,
            error: `TRANSFERT_DEJA_TRAITE: Ce transfert a déjà été traité (statut actuel : ${t.status}). Rechargez la page.`
          };
        }
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
        
        // Garde : n'approuver que si le statut est bien PENDING_APPROVAL
        if (t.status !== 'PENDING_APPROVAL') {
          throw new Error(
            `TRANSFERT_DEJA_TRAITE: Ce transfert a déjà été traité ` +
            `(statut actuel : ${t.status}). Rechargez la page.`
          );
        }

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
        if (t && t.status !== 'APPROUVE') {
          return {
            success: false,
            error: `TRANSFERT_DEJA_TRAITE: Ce transfert a déjà été traité (statut actuel : ${t.status}). Rechargez la page.`
          };
        }
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
        
        // Garde : n'expédier que si le statut est bien APPROUVE
        if (t.status !== 'APPROUVE') {
          throw new Error(
            `TRANSFERT_DEJA_TRAITE: Ce transfert a déjà été traité ` +
            `(statut actuel : ${t.status}). Rechargez la page.`
          );
        }

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
