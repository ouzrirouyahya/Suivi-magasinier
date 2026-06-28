import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Article, Mouvement, PurchaseRequest } from '../../types';
import { firestoreRepository } from '../../infrastructure/firestore/FirestoreRepository';
import { useMovementsStore } from './movements.store';
import { useArticlesStore } from '../articles/articles.store';
import { validateMouvementInvariants } from '../../core/BusinessStateValidator';
import { generateSecureUUID, cleanObject } from '../../lib/utils';

export class MovementsService {
  /**
   * Add a Movement with transaction validation and safety checks
   */
  async addMouvement(mouvement: Mouvement, isSimulation: boolean = false): Promise<{ success: boolean; error?: string }> {
    const movementId = mouvement.id || generateSecureUUID();
    mouvement.id = movementId;

    const { articles } = useArticlesStore.getState();
    const { mouvements } = useMovementsStore.getState();

    // 1. BSV checking of invariants
    const validation = validateMouvementInvariants(mouvement, articles, mouvements);
    if (!validation.isValid) {
      return { success: false, error: `Violation des règles métier : ${validation.errorMsg}` };
    }

    if (isSimulation) {
      try {
        // Simulate locally
        mouvement.date = mouvement.date || new Date().toISOString();
        const updatedArticles = [...articles];
        
        for (const item of mouvement.items) {
          const index = updatedArticles.findIndex(a => a.id === item.articleId);
          if (index !== -1) {
            const article = updatedArticles[index];
            const isAddition = mouvement.type === 'ENTREE' || mouvement.type === 'TRANSFERT_IN' || mouvement.type === 'RETOUR';
            const newQty = isAddition ? article.quantity + item.quantity : article.quantity - item.quantity;
            updatedArticles[index] = { ...article, quantity: Math.max(0, newQty) };
          }
        }
        
        useArticlesStore.getState().setArticles(updatedArticles);
        useMovementsStore.getState().addMouvementLocal(mouvement);
        return { success: true };
      } catch (error: any) {
        console.error('[addMouvement (Simulation)] Erreur:', error);
        return { success: false, error: error.message || 'Erreur lors de la simulation' };
      }
    }

    // 2. Run transactional database update
    try {
      const localArticlesToUpdate: { id: string; quantity: number }[] = [];

      await runTransaction(db, async (transaction) => {
        const movementRef = doc(db, 'mouvements', movementId);
        const movementSnap = await transaction.get(movementRef);
        if (movementSnap.exists()) {
          throw new Error("MOUVEMENT_DEJA_TRAITE");
        }

        let totalValue = 0;
        const articleUpdates: { 
          id: string;
          ref: any; 
          newQty: number; 
          newPMP: number; 
          lastPurchasePrice: number; 
          priceHistory: any[] 
        }[] = [];

        for (const item of mouvement.items) {
          const articleRef = doc(db, 'articles', item.articleId);
          const articleSnap = await transaction.get(articleRef);
          if (!articleSnap.exists()) {
            throw new Error("ARTICLE_INTROUVABLE");
          }
          
          const article = articleSnap.data() as Article;
          totalValue += item.quantity * (article.price || 0);
          
          const isAddition = mouvement.type === 'ENTREE' || mouvement.type === 'TRANSFERT_IN' || mouvement.type === 'RETOUR';
          const newQty = isAddition ? (article.quantity || 0) + item.quantity : (article.quantity || 0) - item.quantity;
          
          if (newQty < 0) {
            throw new Error(`Stock insuffisant pour l'article ${article.ref}. Disponible: ${article.quantity || 0}, Demandé: ${item.quantity}`);
          }

          // PMP Calculation
          let newPMP = article.price || 0;
          let lastPurchasePrice = article.lastPurchasePrice || 0;
          const existingHistory = article.priceHistory || [];
          const updatedHistory = [...existingHistory];

          if (isAddition) {
            const itemPrice = item.price || 0;
            if (itemPrice > 0) {
              lastPurchasePrice = itemPrice;
              const currentQty = article.quantity || 0;
              const currentPMP = article.price || 0;
              const totalQty = currentQty + item.quantity;
              newPMP = totalQty > 0 ? ((currentQty * currentPMP) + (item.quantity * itemPrice)) / totalQty : itemPrice;
              newPMP = Math.round(newPMP * 100) / 100;
            }

            // Traçabilité des variations de prix
            updatedHistory.push({
              date: mouvement.date || new Date().toISOString(),
              price: item.price || 0,
              type: 'ACHAT',
              quantityAttached: item.quantity,
              mouvementId: movementId,
              userEmail: mouvement.createdBy || 'system'
            });

            updatedHistory.push({
              date: mouvement.date || new Date().toISOString(),
              price: newPMP,
              type: 'PMP',
              quantityAttached: newQty,
              mouvementId: movementId,
              userEmail: mouvement.createdBy || 'system'
            });
          }

          articleUpdates.push({ 
            id: item.articleId,
            ref: articleRef, 
            newQty, 
            newPMP, 
            lastPurchasePrice, 
            priceHistory: updatedHistory.slice(-100) 
          });
        }

        // Update articles fields
        for (const update of articleUpdates) {
          transaction.update(update.ref, { 
            quantity: update.newQty,
            price: update.newPMP,
            lastPurchasePrice: update.lastPurchasePrice,
            priceHistory: update.priceHistory
          });
          localArticlesToUpdate.push({ id: update.id, quantity: update.newQty });
        }

        // Record movement
        transaction.set(movementRef, cleanObject({
          ...mouvement,
          id: movementId,
          date: mouvement.date || new Date().toISOString()
        }));

        // In-transaction audit log
        const logId = generateSecureUUID();
        const auditLogRef = doc(db, 'auditLogs', logId);
        transaction.set(auditLogRef, cleanObject({
          id: logId,
          timestamp: new Date().toISOString(),
          userEmail: mouvement.createdBy || 'system_service_account',
          site: mouvement.site,
          action: mouvement.type,
          details: `Réf: ${mouvement.reference || 'Aucune'}`,
          amount: totalValue
        }));
      });

      // Sync state locally ONLY after successful transaction commit
      localArticlesToUpdate.forEach(upd => {
        useArticlesStore.getState().updateArticleLocal(upd.id, { quantity: upd.quantity });
      });
      useMovementsStore.getState().addMouvementLocal(mouvement);

      return { success: true };
    } catch (error: any) {
      console.error('[addMouvement] Transaction échouée:', error);
      return { 
        success: false, 
        error: error.message || 'Erreur lors de l\'enregistrement du mouvement' 
      };
    }
  }

  /**
   * Submit purchase request
   */
  async addPurchaseRequest(pr: PurchaseRequest, isSimulation: boolean = false): Promise<{ success: boolean; error?: string }> {
    try {
      const prId = pr.id || generateSecureUUID();
      const entry = { ...pr, id: prId };

      if (isSimulation) {
        useMovementsStore.getState().addPRLocal(entry);
        return { success: true };
      }

      await firestoreRepository.write('purchaseRequests', prId, cleanObject(entry));
      useMovementsStore.getState().addPRLocal(entry);
      return { success: true };
    } catch (error: any) {
      console.error('[addPurchaseRequest] Erreur:', error);
      return { success: false, error: error.message || 'Erreur lors de la demande d\'achat' };
    }
  }

  /**
   * Update purchase request status
   */
  async updatePRStatus(id: string, status: any, isSimulation: boolean = false): Promise<{ success: boolean; error?: string }> {
    try {
      if (isSimulation) {
        useMovementsStore.getState().updatePRStatusLocal(id, status);
        return { success: true };
      }

      await firestoreRepository.update('purchaseRequests', id, { status });
      useMovementsStore.getState().updatePRStatusLocal(id, status);
      return { success: true };
    } catch (error: any) {
      console.error('[updatePRStatus] Erreur:', error);
      return { success: false, error: error.message || 'Erreur lors du changement de statut de la demande' };
    }
  }
}

export const movementsService = new MovementsService();
