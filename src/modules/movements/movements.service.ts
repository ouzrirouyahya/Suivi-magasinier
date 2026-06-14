import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Article, Mouvement, PurchaseRequest } from '../../types';
import { firestoreRepository } from '../../infrastructure/firestore/FirestoreRepository';
import { useMovementsStore } from './movements.store';
import { useArticlesStore } from '../articles/articles.store';
import { useSystemStore } from '../system/system.store';
import { validateMouvementInvariants } from '../../core/BusinessStateValidator';
import { generateSecureUUID, cleanObject } from '../../lib/utils';
import { toast } from 'sonner';

export class MovementsService {
  /**
   * Add a Movement with transaction validation and safety checks
   */
  async addMouvement(mouvement: Mouvement, isSimulation: boolean = false): Promise<void> {
    const movementId = mouvement.id || generateSecureUUID();
    mouvement.id = movementId;

    const { articles } = useArticlesStore.getState();
    const { mouvements } = useMovementsStore.getState();

    // 1. BSV checking of invariants
    const validation = validateMouvementInvariants(mouvement, articles, mouvements);
    if (!validation.isValid) {
      throw new Error(`INVARIANT_VIOLATION: ${validation.errorMsg}`);
    }

    if (isSimulation) {
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
      return;
    }

    // 2. Run transactional database update
    await firestoreRepository.runTransactionBlock(async (transaction) => {
      const movementRef = doc(db, 'mouvements', movementId);
      const movementSnap = await transaction.get(movementRef);
      if (movementSnap.exists()) {
        throw new Error("MOUVEMENT_DEJA_TRAITE");
      }

      let totalValue = 0;
      const articleUpdates: { ref: any, newQty: number }[] = [];

      for (const item of mouvement.items) {
        const articleRef = doc(db, 'articles', item.articleId);
        const articleSnap = await transaction.get(articleRef);
        if (!articleSnap.exists()) {
          throw new Error("ARTICLE_INTROUVABLE");
        }
        
        const article = articleSnap.data() as Article;
        totalValue += item.quantity * (article.price || 0);
        
        const isAddition = mouvement.type === 'ENTREE' || mouvement.type === 'TRANSFERT_IN' || mouvement.type === 'RETOUR';
        const newQty = isAddition ? article.quantity + item.quantity : article.quantity - item.quantity;
        
        if (newQty < 0) {
          throw new Error("STOCK_INSUFFISANT");
        }
        articleUpdates.push({ ref: articleRef, newQty });
      }

      // Update articles quantities
      for (const update of articleUpdates) {
        transaction.update(update.ref, { quantity: update.newQty });
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
        userEmail: mouvement.vendeur || 'system_service_account',
        site: mouvement.site,
        action: mouvement.type,
        details: `Réf: ${mouvement.reference || 'Aucune'}`,
        amount: totalValue
      }));
    });

    // Sync state locally
    useMovementsStore.getState().addMouvementLocal(mouvement);
  }

  /**
   * Submit purchase request
   */
  async addPurchaseRequest(pr: PurchaseRequest, isSimulation: boolean = false): Promise<void> {
    const prId = pr.id || generateSecureUUID();
    const entry = { ...pr, id: prId };

    if (isSimulation) {
      useMovementsStore.getState().addPRLocal(entry);
      return;
    }

    await firestoreRepository.write('purchaseRequests', prId, cleanObject(entry));
    useMovementsStore.getState().addPRLocal(entry);
  }

  /**
   * Update purchase request status
   */
  async updatePRStatus(id: string, status: any, isSimulation: boolean = false): Promise<void> {
    if (isSimulation) {
      useMovementsStore.getState().updatePRStatusLocal(id, status);
      return;
    }

    await firestoreRepository.update('purchaseRequests', id, { status });
    useMovementsStore.getState().updatePRStatusLocal(id, status);
  }
}

export const movementsService = new MovementsService();
