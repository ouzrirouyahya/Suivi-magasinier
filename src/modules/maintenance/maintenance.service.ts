import { doc, db } from '../../lib/db';
import { Article, MaintenanceLog, SiteCode } from '../../types';
import { firestoreRepository } from '../../infrastructure/firestore/FirestoreRepository';
import { useMaintenanceStore } from './maintenance.store';
import { useArticlesStore } from '../articles/articles.store';
import { useSystemStore } from '../system/system.store';
import { useAuthStore } from '../auth/auth.store';
import { validateMaintenanceInvariants } from '../../core/BusinessStateValidator';
import { generateSecureUUID, cleanObject, logger } from '../../lib/utils';
import { SITE_CODES } from '../../lib/constants';

export class MaintenanceService {
  /**
   * Add a maintenance log entry and deduct spare parts
   */
  async addMaintenanceLog(log: MaintenanceLog, isSimulation: boolean = false): Promise<void> {
    const id = log.id || generateSecureUUID();
    log.id = id;

    const { articles } = useArticlesStore.getState();
    const { engins, perfos } = useMaintenanceStore.getState();
    const { currentSite } = useAuthStore.getState();

    // 1. BSV checking of invariants
    const validation = validateMaintenanceInvariants(log, articles);
    if (!validation.isValid) {
      throw new Error(`INVARIANT_VIOLATION: ${validation.errorMsg}`);
    }

    if (isSimulation) {
      const updatedArticles = [...articles];
      if (log.partsUsed && log.partsUsed.length > 0) {
        log.partsUsed.forEach((part) => {
          const index = updatedArticles.findIndex(a => a.id === part.articleId);
          if (index !== -1) {
            const article = updatedArticles[index];
            updatedArticles[index] = { ...article, quantity: Math.max(0, article.quantity - part.quantity) };
          }
        });
      }

      useArticlesStore.getState().setArticles(updatedArticles);
      useMaintenanceStore.getState().addMaintenanceLogLocal(log);
      return;
    }

    // 2. Transaction
    await firestoreRepository.runTransactionBlock(async (transaction) => {
      // Idempotency check
      const logRef = doc(db, 'maintenanceLogs', id);
      const logSnap = await transaction.get(logRef);
      if (logSnap.exists()) {
        throw new Error("OPERATION_DEJA_EXECUTE");
      }

      const articleUpdates: { ref: any, newQty: number, price: number, article: Article }[] = [];

      if (log.partsUsed && log.partsUsed.length > 0) {
        for (const part of log.partsUsed) {
          const articleRef = doc(db, 'articles', part.articleId);
          const articleSnap = await transaction.get(articleRef);
          if (!articleSnap.exists()) {
            throw new Error("ARTICLE_INTROUVABLE");
          }
          const article = articleSnap.data() as Article;
          const newQty = article.quantity - part.quantity;
          if (newQty < 0) {
            throw new Error("STOCK_INSUFFISANT");
          }
          articleUpdates.push({ ref: articleRef, newQty, price: article.price || 0, article });
        }
      }

      // Perform stock updates
      for (const update of articleUpdates) {
        transaction.update(update.ref, { quantity: update.newQty });
      }

      // Resolve the machine's site
      let machineSite: SiteCode = (currentSite && currentSite !== 'ALL') 
        ? currentSite 
        : SITE_CODES[0]; // SMI par défaut uniquement

      if (log.machineType === 'ENGIN') {
        const matchedEngin = engins.find(e => e.id === log.machineId);
        if (matchedEngin) machineSite = matchedEngin.site;
      } else if (log.machineType === 'PERFO') {
        const matchedPerfo = perfos.find(p => p.id === log.machineId);
        if (matchedPerfo) machineSite = matchedPerfo.site;
      }

      // Après la recherche engin/perfo, si toujours pas trouvé :
      if (machineSite === SITE_CODES[0] && currentSite === 'ALL') {
        logger.warn(
          `[MaintenanceService] Site de l'engin ${log.machineId} non trouvé. ` +
          `Enregistrement sur ${SITE_CODES[0]} par défaut.`
        );
      }

      // Vérifier que toutes les pièces utilisées appartiennent 
      // bien au chantier de l'engin/perforateur
      if (log.partsUsed && log.partsUsed.length > 0) {
        for (const update of articleUpdates) {
          if (update.article.site && update.article.site !== machineSite) {
            throw new Error(
              `INVARIANT_VIOLATION: La pièce "${update.article.ref}" appartient au ` +
              `chantier ${update.article.site} mais la maintenance est enregistrée ` +
              `sur ${machineSite}.`
            );
          }
        }
      }

      // Record associated movements if parts are used
      if (log.partsUsed && log.partsUsed.length > 0) {
        log.partsUsed.forEach((part, index) => {
          const update = articleUpdates[index];
          const mId = generateSecureUUID();
          const movementRef = doc(db, 'mouvements', mId);
          const partArticle = update?.article;

          transaction.set(movementRef, cleanObject({
            id: mId,
            site: machineSite,
            date: log.date || new Date().toISOString(),
            type: 'SORTIE',
            reference: `MAINT-${id}`,
            createdBy: log.performer || 'system_service_account',
            items: [{ 
              articleId: part.articleId, 
              quantity: part.quantity, 
              price: update.price,
              articleDesignation: partArticle?.designation || '',
              articleRef: partArticle?.ref || '',
              articleUnit: partArticle?.unit || 'PIECE',
            }],
            notes: `Utilisé pour maintenance ${log.type} sur ${log.machineId}`,
            status: 'COMPLETE'
          }));
        });
      }

      // Set maintenance log
      transaction.set(logRef, cleanObject({ ...log, id, site: machineSite }));

      // Audit log inside transaction
      const auditLogId = generateSecureUUID();
      const auditLogRef = doc(db, 'auditLogs', auditLogId);
      transaction.set(auditLogRef, cleanObject({
        id: auditLogId,
        timestamp: new Date().toISOString(),
        userEmail: log.performer || 'system_service_account',
        site: machineSite,
        action: 'MAINTENANCE',
        details: `Machine: ${log.machineId}`,
        amount: log.cost || 0
      }));
    });

    useMaintenanceStore.getState().addMaintenanceLogLocal(log);
  }
}

export const maintenanceService = new MaintenanceService();
