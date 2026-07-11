import { doc, runTransaction, db } from '../../lib/db';
import { Article, Mouvement, PurchaseRequest, Inventaire, toDateString } from '../../types';
import { firestoreRepository } from '../../infrastructure/firestore/FirestoreRepository';
import { useMovementsStore } from './movements.store';
import { useArticlesStore } from '../articles/articles.store';
import { validateMouvementInvariants } from '../../core/BusinessStateValidator';
import { generateSecureUUID, cleanObject, logger } from '../../lib/utils';
import { calculatePriceUpdates } from '../../context/InventoryContext';

export class MovementsService {
  /**
   * Add a Movement with transaction validation and safety checks
   */
  async addMouvement(mouvement: Mouvement, isSimulation: boolean = false): Promise<{ success: boolean; error?: string }> {
    const movementId = mouvement.id || generateSecureUUID();
    mouvement.id = movementId;

    const { articles } = useArticlesStore.getState();
    const { mouvements } = useMovementsStore.getState();

    // Enrichir chaque item avec les infos de l'article au moment du bon
    mouvement.items = mouvement.items.map(item => {
      const article = articles.find(a => a.id === item.articleId);
      return {
        ...item,
        articleDesignation: article?.designation || item.articleDesignation || '',
        articleRef: article?.ref || item.articleRef || '',
        articleUnit: article?.unit || item.articleUnit || 'PIECE',
      };
    });

    // 1. BSV checking of invariants
    const validation = validateMouvementInvariants(mouvement, articles, mouvements);
    if (!validation.isValid) {
      return { success: false, error: `Violation des règles métier : ${validation.errorMsg}` };
    }    if (isSimulation) {
      try {
        // Simulate locally
        mouvement.date = mouvement.date || new Date().toISOString();
        const updatedArticles = [...articles];
        
        for (const item of mouvement.items) {
          const index = updatedArticles.findIndex(a => a.id === item.articleId);
          if (index !== -1) {
            const article = updatedArticles[index];
            const isAddition = mouvement.type === 'ENTREE' || mouvement.type === 'TRANSFERT_IN' || mouvement.type === 'RETOUR';
            const isPMPUpdatable = mouvement.type === 'ENTREE' || mouvement.type === 'TRANSFERT_IN';
            const isAdjustment = mouvement.type === 'AJUSTEMENT';
            const newQty = isAdjustment
              ? item.quantity
              : isAddition 
                ? (article.quantity || 0) + item.quantity 
                : (article.quantity || 0) - item.quantity;
            
            // Guard supplémentaire pour simulation :
            if (newQty < 0 && !isAdjustment) {
              return { 
                success: false, 
                error: `Stock local insuffisant pour ${article.ref}. ` +
                       `Disponible: ${article.quantity}, Demandé: ${item.quantity}. ` +
                       `Note: le stock réel en ligne peut différer.`
              };
            }

            // PMP Calculation in simulation
            let newPMP = article.price || 0;
            let lastPurchasePrice = article.lastPurchasePrice || 0;
            let updatedHistory = article.priceHistory || [];

            if (isPMPUpdatable) {
              const updates = calculatePriceUpdates(
                article,
                item.quantity,
                item.price || 0,
                movementId,
                mouvement.createdBy,
                mouvement.date as any
              );
              newPMP = updates.price;
              lastPurchasePrice = updates.lastPurchasePrice;
              
              const compactHistory = updates.priceHistory.map((h: any) => {
                if (h && typeof h === 'object' && 'p' in h) {
                  return h;
                }
                return {
                  p: h.price ?? 0,
                  d: toDateString(h.date || mouvement.date || new Date().toISOString()).slice(0, 10),
                  q: h.quantityAttached ?? 0
                };
              });
              updatedHistory = compactHistory;
            } else if (isAddition) {
              // RETOUR : stock augmente mais PMP reste inchangé
              newPMP = article.price || 0;
              lastPurchasePrice = article.lastPurchasePrice || 0;
              const compactHistory = updatedHistory.map((h: any) => {
                if (h && typeof h === 'object' && 'p' in h) {
                  return h;
                }
                return {
                  p: h.price ?? 0,
                  d: toDateString(h.date || mouvement.date || new Date().toISOString()).slice(0, 10),
                  q: h.quantityAttached ?? 0
                };
              });
              const retourEntry = {
                p: article.price || 0,
                d: toDateString(mouvement.date || new Date().toISOString()).slice(0, 10),
                q: item.quantity
              };
              updatedHistory = [...compactHistory, retourEntry];
            } else {
              // Compacter l'historique existant (sans ajout de nouvelle entrée)
              updatedHistory = (article.priceHistory || []).map((h: any) => {
                if (h && typeof h === 'object' && 'p' in h) return h;
                return {
                  p: h.price ?? 0,
                  d: toDateString(h.date || mouvement.date || new Date().toISOString()).slice(0, 10),
                  q: h.quantityAttached ?? 0
                };
              });
            }

            updatedArticles[index] = { 
              ...article, 
              quantity: isAdjustment ? newQty : Math.max(0, newQty),
              price: newPMP,
              lastPurchasePrice,
              priceHistory: updatedHistory.slice(-50)
            };
          }
        }
        
        useArticlesStore.getState().setArticles(updatedArticles);
        useMovementsStore.getState().addMouvementLocal(mouvement);
        return { success: true };
      } catch (error: any) {
        logger.error('[addMouvement (Simulation)] Erreur:', error);
        return { success: false, error: error.message || 'Erreur lors de la simulation' };
      }
    }

    // 2. Run transactional database update
    try {
      const localArticlesToUpdate: { id: string; quantity: number }[] = [];
      const articleUpdates: { 
        id: string;
        ref: any; 
        newQty: number; 
        newPMP: number; 
        lastPurchasePrice: number; 
        priceHistory: any[];
        stockBefore: number;
        articleRefLabel: string;
      }[] = [];

      await runTransaction(db, async (transaction) => {
        const movementRef = doc(db, 'mouvements', movementId);
        const movementSnap = await transaction.get(movementRef);
        if (movementSnap.exists()) {
          throw new Error("MOUVEMENT_DEJA_TRAITE");
        }

        let totalValue = 0;

        for (const item of mouvement.items) {
          const articleRef = doc(db, 'articles', item.articleId);
          const articleSnap = await transaction.get(articleRef);
          if (!articleSnap.exists()) {
            throw new Error("ARTICLE_INTROUVABLE");
          }
          
          const article = articleSnap.data() as Article;
          totalValue += item.quantity * (article.price || 0);
          
          const isAddition = mouvement.type === 'ENTREE' || mouvement.type === 'TRANSFERT_IN' || mouvement.type === 'RETOUR';
          const isPMPUpdatable = mouvement.type === 'ENTREE' || mouvement.type === 'TRANSFERT_IN';
          const isAdjustment = mouvement.type === 'AJUSTEMENT';
          const newQty = isAdjustment
            ? item.quantity
            : isAddition 
              ? (article.quantity || 0) + item.quantity 
              : (article.quantity || 0) - item.quantity;
          
          if (newQty < 0 && !isAdjustment) {
            throw new Error(`Stock insuffisant pour l'article ${article.ref}. Disponible: ${article.quantity || 0}, Demandé: ${item.quantity}`);
          }

          // PMP Calculation
          let newPMP = article.price || 0;
          let lastPurchasePrice = article.lastPurchasePrice || 0;
          let updatedHistory = article.priceHistory || [];

          if (isPMPUpdatable) {
            const updates = calculatePriceUpdates(
              article,
              item.quantity,
              item.price || 0,
              movementId,
              mouvement.createdBy,
              mouvement.date as any
            );
            newPMP = updates.price;
            lastPurchasePrice = updates.lastPurchasePrice;
            
            // Compacter l'historique : migrer les anciennes entrées et stocker les nouvelles sous forme compacte { p, d, q }
            const compactHistory = updates.priceHistory.map((h: any) => {
              if (h && typeof h === 'object' && 'p' in h) {
                return h; // Déjà au format compact
              }
              return {
                p: h.price ?? 0,
                d: toDateString(h.date || mouvement.date || new Date().toISOString()).slice(0, 10),
                q: h.quantityAttached ?? 0
              };
            });
            updatedHistory = compactHistory;
          } else if (isAddition) {
            // RETOUR : stock augmente mais PMP reste inchangé
            newPMP = article.price || 0;  // PMP inchangé
            lastPurchasePrice = article.lastPurchasePrice || 0;
            // S'assurer de compacter l'historique existant
            const compactHistory = updatedHistory.map((h: any) => {
              if (h && typeof h === 'object' && 'p' in h) {
                return h;
              }
              return {
                p: h.price ?? 0,
                d: toDateString(h.date || mouvement.date || new Date().toISOString()).slice(0, 10),
                q: h.quantityAttached ?? 0
              };
            });
            // Ajouter juste une entrée dans l'historique sans modifier le PMP
            const retourEntry = {
              p: article.price || 0,
              d: toDateString(mouvement.date || new Date().toISOString()).slice(0, 10),
              q: item.quantity
            };
            updatedHistory = [...compactHistory, retourEntry];
          } else {
            // Compacter l'historique existant (sans ajout de nouvelle entrée)
            updatedHistory = (article.priceHistory || []).map((h: any) => {
              if (h && typeof h === 'object' && 'p' in h) return h;
              return {
                p: h.price ?? 0,
                d: toDateString(h.date || mouvement.date || new Date().toISOString()).slice(0, 10),
                q: h.quantityAttached ?? 0
              };
            });
          }

          articleUpdates.push({ 
            id: item.articleId,
            ref: articleRef, 
            newQty, 
            newPMP, 
            lastPurchasePrice, 
            priceHistory: updatedHistory.slice(-50),
            stockBefore: article.quantity || 0,
            articleRefLabel: article.ref || item.articleId
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

        // Construire les détails enrichis
        let auditDetails = `Réf: ${mouvement.reference || 'Aucune'}`;

        if (mouvement.type === 'AJUSTEMENT') {
          const adjustDetails = articleUpdates.map(upd => {
            return `${upd.articleRefLabel}: ${upd.stockBefore} → ${upd.newQty}`;
          }).join(' | ');
          auditDetails = `Inventaire ${mouvement.reference || 'Aucune'} — Ajustements: ${adjustDetails}`;
        } else if (mouvement.type === 'SORTIE') {
          const sortieParts = articleUpdates.map(upd => {
            const item = mouvement.items.find(i => i.articleId === upd.id);
            return `${upd.articleRefLabel}: -${item?.quantity || 0} (→ ${upd.newQty})`;
          }).join(' | ');
          auditDetails = `Réf: ${mouvement.reference || 'Aucune'} | ${sortieParts}`;
        } else {
          const parts = articleUpdates.map(upd => {
            const diff = upd.newQty - upd.stockBefore;
            const diffStr = diff >= 0 ? `+${diff}` : `${diff}`;
            return `${upd.articleRefLabel}: ${diffStr} (→ ${upd.newQty})`;
          }).join(' | ');
          auditDetails = `Réf: ${mouvement.reference || 'Aucune'} | ${parts}`;
        }

        transaction.set(auditLogRef, cleanObject({
          id: logId,
          timestamp: new Date().toISOString(),
          userEmail: mouvement.createdBy || 'system_service_account',
          site: mouvement.site,
          action: mouvement.type,
          details: auditDetails,
          amount: totalValue,
          itemCount: mouvement.items.length,
          reference: mouvement.reference
        }));
      });

      // Sync state locally ONLY after successful transaction commit
      localArticlesToUpdate.forEach(upd => {
        const matchingUpdate = articleUpdates.find(u => u.id === upd.id);
        if (matchingUpdate) {
          useArticlesStore.getState().updateArticleLocal(upd.id, { 
            quantity: matchingUpdate.newQty,
            price: matchingUpdate.newPMP,
            lastPurchasePrice: matchingUpdate.lastPurchasePrice,
            priceHistory: matchingUpdate.priceHistory
          });
        } else {
          useArticlesStore.getState().updateArticleLocal(upd.id, { quantity: upd.quantity });
        }
      });
      useMovementsStore.getState().addMouvementLocal(mouvement);

      return { success: true };
    } catch (error: any) {
      logger.error('[addMouvement] Transaction échouée:', error);
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
      logger.error('[addPurchaseRequest] Erreur:', error);
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
      logger.error('[updatePRStatus] Erreur:', error);
      return { success: false, error: error.message || 'Erreur lors du changement de statut de la demande' };
    }
  }

  /**
   * Save or validate an inventory session
   */
  async saveInventaire(
    inventaire: Inventaire, 
    isSimulation: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const invId = inventaire.id || generateSecureUUID();
      const entry = { ...inventaire, id: invId };

      if (isSimulation) {
        // Sauvegarder l'inventaire localement
        useMovementsStore.getState().addInventaireLocal(entry);
      } else {
        // Écriture Firestore réelle
        await firestoreRepository.write('inventaires', invId, cleanObject(entry));
        useMovementsStore.getState().addInventaireLocal(entry);
      }

      // Dans TOUS les cas (online ET offline), si l'inventaire est validé,
      // déclencher les AJUSTEMENTs pour mettre à jour le stock local immédiatement
      if (entry.status === 'VALIDE') {
        const itemsWithDifference = entry.items.filter(item => 
          item.countedQuantity !== item.theoricQuantity
        );
        if (itemsWithDifference.length > 0) {
          const adjustmentMovement: Mouvement = {
            id: generateSecureUUID(),
            site: entry.site,
            date: new Date().toISOString(),
            type: 'AJUSTEMENT',
            reference: `Inventaire ${entry.compteur || entry.id}`,
            items: itemsWithDifference.map(item => ({
              articleId: item.articleId,
              quantity: item.countedQuantity,
              price: 0
            })),
            status: 'VALIDE',
            createdBy: entry.validePar || 'Admin'
          };
          
          // Passer isSimulation en cascade : offline → simulation locale,
          // online → vraie transaction Firestore
          const adjResult = await this.addMouvement(adjustmentMovement, isSimulation);
          if (!adjResult.success) {
            logger.error('[saveInventaire] Échec AJUSTEMENT:', adjResult.error);
            // Ne pas faire échouer tout l'inventaire si l'ajustement échoue,
            // mais logger clairement pour investigation
          }
        }
      }

      return { success: true };
    } catch (error: any) {
      logger.error('[saveInventaire] Erreur:', error);
      return { success: false, error: error.message || 'Erreur inconnue' };
    }
  }
}

export const movementsService = new MovementsService();
