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
        if (mouvement.needsSuperAdminApproval) {
          // Si simulation d'un bon en attente d'approbation, on l'ajoute juste localement sans toucher au stock
          const toSaveLocal: Mouvement = {
            ...mouvement,
            status: 'EN_ATTENTE_APPROBATION'
          };
          useMovementsStore.getState().addMouvementLocal(toSaveLocal);
          return { success: true };
        }
        const updatedArticles = [...articles];
        
        for (const item of mouvement.items) {
          const index = updatedArticles.findIndex(a => a.id === item.articleId);
          if (index !== -1) {
            const article = updatedArticles[index];
            const isAddition = mouvement.type === 'ENTREE' || mouvement.type === 'TRANSFERT_IN' || (mouvement.type === 'RETOUR' && (!mouvement.condition || mouvement.condition === 'NEUF' || mouvement.condition === 'BON'));
            const isReduction = mouvement.type === 'SORTIE' || mouvement.type === 'TRANSFERT_OUT';
            const isPMPUpdatable = mouvement.type === 'ENTREE' || mouvement.type === 'TRANSFERT_IN';
            const isAdjustment = mouvement.type === 'AJUSTEMENT';
            let newQty = isAdjustment
              ? item.quantity
              : isAddition 
                ? (article.quantity || 0) + item.quantity 
                : isReduction
                  ? (article.quantity || 0) - item.quantity
                  : (article.quantity || 0);
            newQty = Math.round(newQty * 1000) / 1000;
            
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

    if (mouvement.needsSuperAdminApproval) {
      // Pour les mouvements en attente d'approbation superadmin:
      // On l'enregistre simplement dans Firestore sans impacter le stock
      try {
        const movementRef = doc(db, 'mouvements', movementId);
        const toSave: Mouvement = {
          ...mouvement,
          id: movementId,
          status: 'EN_ATTENTE_APPROBATION',
          date: mouvement.date || new Date().toISOString()
        };
        
        await runTransaction(db, async (transaction) => {
          const snap = await transaction.get(movementRef);
          if (snap.exists()) {
            throw new Error("MOUVEMENT_DEJA_TRAITE");
          }
          transaction.set(movementRef, cleanObject(toSave));

          // Enregistrer un log d'audit
          const logId = generateSecureUUID();
          const auditLogRef = doc(db, 'auditLogs', logId);
          transaction.set(auditLogRef, {
            id: logId,
            timestamp: new Date().toISOString(),
            userEmail: mouvement.createdBy || 'system_service_account',
            site: mouvement.site,
            action: 'MOUVEMENT_ATTENTE_APPROBATION',
            details: `Saisie rétroactive du bon ${mouvement.reference || 'Aucun'} (>30 jours) soumise à approbation. Justification : ${mouvement.backdateReason || 'Aucune'}`
          });
        });
        
        useMovementsStore.getState().addMouvementLocal(toSave);
        return { success: true };
      } catch (error: any) {
        logger.error('[addMouvement (Approbation)] Erreur:', error);
        return { success: false, error: error.message || "Erreur de soumission à l'approbation" };
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

        // Vérification de la clôture mensuelle pour verrouiller la période
        const targetMonth = toDateString(mouvement.date || new Date().toISOString()).slice(0, 7);
        const closingRef = doc(db, 'monthlyClosings', targetMonth);
        const closingSnap = await transaction.get(closingRef);
        if (closingSnap.exists()) {
          throw new Error(`PERIODE_CLOTUREE: La période ${targetMonth} est close et comptablement scellée.`);
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
          
          const existingUpdateIndex = articleUpdates.findIndex(u => u.id === item.articleId);
          const baseQty = existingUpdateIndex !== -1 ? articleUpdates[existingUpdateIndex].newQty : (article.quantity || 0);
          const basePMP = existingUpdateIndex !== -1 ? articleUpdates[existingUpdateIndex].newPMP : (article.price || 0);
          const baseLastPurchasePrice = existingUpdateIndex !== -1 ? articleUpdates[existingUpdateIndex].lastPurchasePrice : (article.lastPurchasePrice || 0);
          const baseHistory = existingUpdateIndex !== -1 ? articleUpdates[existingUpdateIndex].priceHistory : (article.priceHistory || []);

          const isAddition = mouvement.type === 'ENTREE' || mouvement.type === 'TRANSFERT_IN' || (mouvement.type === 'RETOUR' && (!mouvement.condition || mouvement.condition === 'NEUF' || mouvement.condition === 'BON'));
          const isReduction = mouvement.type === 'SORTIE' || mouvement.type === 'TRANSFERT_OUT';
          const isPMPUpdatable = mouvement.type === 'ENTREE' || mouvement.type === 'TRANSFERT_IN';
          const isAdjustment = mouvement.type === 'AJUSTEMENT';
          let newQty = isAdjustment
            ? item.quantity
            : isAddition 
              ? baseQty + item.quantity 
              : isReduction
                ? baseQty - item.quantity
                : baseQty;
          newQty = Math.round(newQty * 1000) / 1000;
          
          if (newQty < 0 && !isAdjustment) {
            throw new Error(`Stock insuffisant pour l'article ${article.ref}. Disponible: ${baseQty}, Demandé: ${item.quantity}`);
          }

          // PMP Calculation
          let newPMP = basePMP;
          let lastPurchasePrice = baseLastPurchasePrice;
          let updatedHistory = baseHistory;

          if (isPMPUpdatable) {
            const tempArticleForPMP: Article = {
              ...article,
              quantity: baseQty,
              price: basePMP,
              lastPurchasePrice: baseLastPurchasePrice,
              priceHistory: baseHistory
            };
            const updates = calculatePriceUpdates(
              tempArticleForPMP,
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
            newPMP = basePMP;  // PMP inchangé
            lastPurchasePrice = baseLastPurchasePrice;
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
              p: basePMP,
              d: toDateString(mouvement.date || new Date().toISOString()).slice(0, 10),
              q: item.quantity
            };
            updatedHistory = [...compactHistory, retourEntry];
          } else {
            // Compacter l'historique existant (sans ajout de nouvelle entrée)
            updatedHistory = updatedHistory.map((h: any) => {
              if (h && typeof h === 'object' && 'p' in h) return h;
              return {
                p: h.price ?? 0,
                d: toDateString(h.date || mouvement.date || new Date().toISOString()).slice(0, 10),
                q: h.quantityAttached ?? 0
              };
            });
          }

          const updateObj = { 
            id: item.articleId,
            ref: articleRef, 
            newQty, 
            newPMP, 
            lastPurchasePrice, 
            priceHistory: updatedHistory.slice(-50),
            stockBefore: existingUpdateIndex !== -1 ? articleUpdates[existingUpdateIndex].stockBefore : (article.quantity || 0),
            articleRefLabel: article.ref || item.articleId
          };

          if (existingUpdateIndex !== -1) {
            articleUpdates[existingUpdateIndex] = updateObj;
          } else {
            articleUpdates.push(updateObj);
          }
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
   * Approves a backdated movement and applies its stock updates in a single transaction
   */
  async approveMouvement(movementId: string, approvedByEmail: string): Promise<{ success: boolean; error?: string }> {
    try {
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
      
      let totalValue = 0;
      let finalMovementData: Mouvement | null = null;

      await runTransaction(db, async (transaction) => {
        const movementRef = doc(db, 'mouvements', movementId);
        const movementSnap = await transaction.get(movementRef);
        if (!movementSnap.exists()) {
          throw new Error("MOUVEMENT_INTROUVABLE");
        }
        const mData = movementSnap.data() as Mouvement;
        if (mData.status !== 'EN_ATTENTE_APPROBATION') {
          throw new Error("Mouvement déjà traité (statut: " + mData.status + ")");
        }

        finalMovementData = {
          ...mData,
          status: 'VALIDE',
          approvedBySuperAdmin: true,
          approvedBy: approvedByEmail,
          approvedAt: new Date().toISOString()
        };

        // Vérification de la clôture mensuelle pour verrouiller la période
        const targetMonth = toDateString(mData.date || new Date().toISOString()).slice(0, 7);
        const closingRef = doc(db, 'monthlyClosings', targetMonth);
        const closingSnap = await transaction.get(closingRef);
        if (closingSnap.exists()) {
          throw new Error(`PERIODE_CLOTUREE: La période ${targetMonth} est close.`);
        }

        for (const item of mData.items) {
          const articleRef = doc(db, 'articles', item.articleId);
          const articleSnap = await transaction.get(articleRef);
          if (!articleSnap.exists()) {
            throw new Error(`Article ${item.articleId} introuvable`);
          }
          
          const article = articleSnap.data() as Article;
          totalValue += item.quantity * (article.price || 0);
          
          const existingUpdateIndex = articleUpdates.findIndex(u => u.id === item.articleId);
          const baseQty = existingUpdateIndex !== -1 ? articleUpdates[existingUpdateIndex].newQty : (article.quantity || 0);
          const basePMP = existingUpdateIndex !== -1 ? articleUpdates[existingUpdateIndex].newPMP : (article.price || 0);
          const baseLastPurchasePrice = existingUpdateIndex !== -1 ? articleUpdates[existingUpdateIndex].lastPurchasePrice : (article.lastPurchasePrice || 0);
          const baseHistory = existingUpdateIndex !== -1 ? articleUpdates[existingUpdateIndex].priceHistory : (article.priceHistory || []);

          const isAddition = mData.type === 'ENTREE' || mData.type === 'TRANSFERT_IN' || (mData.type === 'RETOUR' && (!mData.condition || mData.condition === 'NEUF' || mData.condition === 'BON'));
          const isReduction = mData.type === 'SORTIE' || mData.type === 'TRANSFERT_OUT';
          const isPMPUpdatable = mData.type === 'ENTREE' || mData.type === 'TRANSFERT_IN';
          const isAdjustment = mData.type === 'AJUSTEMENT';
          
          let newQty = isAdjustment
            ? item.quantity
            : isAddition 
              ? baseQty + item.quantity 
              : isReduction
                ? baseQty - item.quantity
                : baseQty;
          newQty = Math.round(newQty * 1000) / 1000;
          
          if (newQty < 0 && !isAdjustment) {
            throw new Error(`Stock insuffisant pour l'article ${article.ref}. Disponible: ${baseQty}, Requis: ${item.quantity}`);
          }

          let newPMP = basePMP;
          let lastPurchasePrice = baseLastPurchasePrice;
          let updatedHistory = baseHistory;

          if (isPMPUpdatable) {
            const tempArticleForPMP: Article = {
              ...article,
              quantity: baseQty,
              price: basePMP,
              lastPurchasePrice: baseLastPurchasePrice,
              priceHistory: baseHistory
            };
            const updates = calculatePriceUpdates(
              tempArticleForPMP,
              item.quantity,
              item.price || 0,
              movementId,
              mData.createdBy,
              mData.date as any
            );
            newPMP = updates.price;
            lastPurchasePrice = updates.lastPurchasePrice;
            
            const compactHistory = updates.priceHistory.map((h: any) => {
              if (h && typeof h === 'object' && 'p' in h) return h;
              return {
                p: h.price ?? 0,
                d: toDateString(h.date || mData.date || new Date().toISOString()).slice(0, 10),
                q: h.quantityAttached ?? 0
              };
            });
            updatedHistory = compactHistory;
          } else if (isAddition) {
            newPMP = basePMP;
            lastPurchasePrice = baseLastPurchasePrice;
            const compactHistory = updatedHistory.map((h: any) => {
              if (h && typeof h === 'object' && 'p' in h) return h;
              return {
                p: h.price ?? 0,
                d: toDateString(h.date || mData.date || new Date().toISOString()).slice(0, 10),
                q: h.quantityAttached ?? 0
              };
            });
            const retourEntry = {
              p: basePMP,
              d: toDateString(mData.date || new Date().toISOString()).slice(0, 10),
              q: item.quantity
            };
            updatedHistory = [...compactHistory, retourEntry];
          } else {
            updatedHistory = updatedHistory.map((h: any) => {
              if (h && typeof h === 'object' && 'p' in h) return h;
              return {
                p: h.price ?? 0,
                d: toDateString(h.date || mData.date || new Date().toISOString()).slice(0, 10),
                q: h.quantityAttached ?? 0
              };
            });
          }

          const updateObj = { 
            id: item.articleId,
            ref: articleRef, 
            newQty, 
            newPMP, 
            lastPurchasePrice, 
            priceHistory: updatedHistory.slice(-50),
            stockBefore: existingUpdateIndex !== -1 ? articleUpdates[existingUpdateIndex].stockBefore : (article.quantity || 0),
            articleRefLabel: article.ref || item.articleId
          };

          if (existingUpdateIndex !== -1) {
            articleUpdates[existingUpdateIndex] = updateObj;
          } else {
            articleUpdates.push(updateObj);
          }
        }

        // Appliquer les mises à jour aux articles
        for (const update of articleUpdates) {
          transaction.update(update.ref, { 
            quantity: update.newQty,
            price: update.newPMP,
            lastPurchasePrice: update.lastPurchasePrice,
            priceHistory: update.priceHistory
          });
        }

        // Mettre à jour le mouvement
        transaction.update(movementRef, {
          status: 'VALIDE',
          approvedBySuperAdmin: true,
          approvedBy: approvedByEmail,
          approvedAt: new Date().toISOString()
        });

        // Log d'audit de l'approbation
        const logId = generateSecureUUID();
        const auditLogRef = doc(db, 'auditLogs', logId);
        transaction.set(auditLogRef, {
          id: logId,
          timestamp: new Date().toISOString(),
          userEmail: approvedByEmail,
          site: mData.site,
          action: 'MOUVEMENT_APPROUVE',
          details: `Approbation du bon rétroactif ${mData.reference || 'Aucun'} par ${approvedByEmail}. Justification d'origine : ${mData.backdateReason || 'Aucune'}`
        });
      });

      // Mettre à jour l'état local
      if (finalMovementData) {
        useMovementsStore.getState().setMouvements(prev => 
          prev.map(m => m.id === movementId ? finalMovementData! : m)
        );
        // Mettre à jour les articles en local
        for (const upd of articleUpdates) {
          useArticlesStore.getState().updateArticleLocal(upd.id, { quantity: upd.newQty, price: upd.newPMP, lastPurchasePrice: upd.lastPurchasePrice, priceHistory: upd.priceHistory });
        }
      }

      return { success: true };
    } catch (error: any) {
      logger.error('[approveMouvement] Erreur:', error);
      return { success: false, error: error.message || "Erreur d'approbation" };
    }
  }

  /**
   * Rejects a backdated movement
   */
  async rejectMouvement(movementId: string, rejectedByEmail: string): Promise<{ success: boolean; error?: string }> {
    try {
      let finalMovementData: Mouvement | null = null;
      await runTransaction(db, async (transaction) => {
        const movementRef = doc(db, 'mouvements', movementId);
        const movementSnap = await transaction.get(movementRef);
        if (!movementSnap.exists()) {
          throw new Error("MOUVEMENT_INTROUVABLE");
        }
        const mData = movementSnap.data() as Mouvement;
        if (mData.status !== 'EN_ATTENTE_APPROBATION') {
          throw new Error("Mouvement déjà traité");
        }

        finalMovementData = {
          ...mData,
          status: 'REFUSE_APPROBATION',
          rejectedBy: rejectedByEmail,
          rejectedAt: new Date().toISOString()
        };

        transaction.update(movementRef, {
          status: 'REFUSE_APPROBATION',
          rejectedBy: rejectedByEmail,
          rejectedAt: new Date().toISOString()
        });

        const logId = generateSecureUUID();
        const auditLogRef = doc(db, 'auditLogs', logId);
        transaction.set(auditLogRef, {
          id: logId,
          timestamp: new Date().toISOString(),
          userEmail: rejectedByEmail,
          site: mData.site,
          action: 'MOUVEMENT_REFUSE',
          details: `Refus du bon rétroactif ${mData.reference || 'Aucun'} par ${rejectedByEmail}.`
        });
      });

      if (finalMovementData) {
        useMovementsStore.getState().setMouvements(prev => 
          prev.map(m => m.id === movementId ? finalMovementData! : m)
        );
      }

      return { success: true };
    } catch (error: any) {
      logger.error('[rejectMouvement] Erreur:', error);
      return { success: false, error: error.message || "Erreur de rejet" };
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
