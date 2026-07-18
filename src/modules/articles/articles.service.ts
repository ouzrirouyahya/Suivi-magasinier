import { doc, setDoc, db, runTransaction } from '../../lib/db';
import { Article, CatalogItem, SiteCode } from '../../types';
import { firestoreRepository } from '../../infrastructure/firestore/FirestoreRepository';
import { useArticlesStore } from './articles.store';
import { generateId, cleanObject, logger, sanitizeForFirestoreId } from '../../lib/utils';

export class ArticlesService {
  /**
   * Add or update an article
   */
  async saveArticle(article: Article, isSimulation: boolean = false): Promise<{ success: boolean; error?: string }> {
    try {
      // Si article.id est déjà fourni (cas d'une MISE À JOUR d'un article existant)
      if (article.id) {
        const item = { ...article };
        if (isSimulation) {
          useArticlesStore.getState().addArticleLocal(item);
          return { success: true };
        }
        await firestoreRepository.write('articles', article.id, cleanObject(item));
        useArticlesStore.getState().addArticleLocal(item);
        return { success: true };
      }

      // Cas d'une CRÉATION : ID déterministe basé sur le chantier (site) et la référence
      const deterministicId = `${article.site}_${sanitizeForFirestoreId(article.ref)}`;
      const item = { ...article, id: deterministicId, active: true };

      if (isSimulation) {
        useArticlesStore.getState().addArticleLocal(item);
        return { success: true };
      }

      await runTransaction(db, async (transaction) => {
        const docRef = doc(db, 'articles', deterministicId);
        const docSnap = await transaction.get(docRef);
        
        if (docSnap.exists()) {
          const existingData = docSnap.data();
          if (existingData && existingData.active !== false) {
            throw new Error(`REFERENCE_DEJA_UTILISEE: La référence "${article.ref}" existe déjà sur le chantier ${article.site}.`);
          }
        }
        
        transaction.set(docRef, cleanObject(item));
      });

      useArticlesStore.getState().addArticleLocal(item);
      return { success: true };
    } catch (error: any) {
      logger.error('[saveArticle] Erreur:', error);
      return { success: false, error: error.message || "Erreur lors de la sauvegarde de l'article" };
    }
  }

  /**
   * Delete articles (Soft delete)
   */
  async deleteArticles(ids: string[], isSimulation: boolean = false): Promise<{ success: boolean; error?: string }> {
    if (ids.length === 0) {
      return { success: true };
    }

    try {
      if (isSimulation) {
        useArticlesStore.getState().deleteArticlesLocal(ids);
        return { success: true };
      }

      const batch = firestoreRepository.createBatch();
      ids.forEach(id => {
        batch.update(doc(db, 'articles', id), { deleted: true });
      });
      await batch.commit();

      useArticlesStore.getState().deleteArticlesLocal(ids);
      return { success: true };
    } catch (error: any) {
      logger.error('[deleteArticles] Erreur:', error);
      return { success: false, error: error.message || "Erreur lors de la suppression des articles" };
    }
  }

  /**
   * Import all catalog articles onto a specific site
   */
  async importAllCatalogToArticles(
    targetSite: SiteCode, 
    excludeCostly: boolean | number = true,
    catalog: CatalogItem[]
  ): Promise<{ success: boolean; error?: string; imported: number; skipped: number }> {
    try {
      const articlesState = useArticlesStore.getState().articles;
      const existingRefs = new Set(articlesState.filter(a => a.site === targetSite).map(a => a.ref));
      
      let imported = 0;
      let skipped = 0;

      const priceThreshold = typeof excludeCostly === 'number' ? excludeCostly : 50000;
      const catalogToImport = catalog.filter(item => {
        if (existingRefs.has(item.reference)) {
          skipped++;
          return false;
        }
        if (excludeCostly && (item.price || 0) > priceThreshold) {
          skipped++;
          return false;
        }
        return true;
      });

      if (catalogToImport.length === 0) {
        return { success: true, imported: 0, skipped };
      }

      const addedArticles: Article[] = [];
      const chunkSize = 400;
      for (let i = 0; i < catalogToImport.length; i += chunkSize) {
        const chunk = catalogToImport.slice(i, i + chunkSize);
        const batch = firestoreRepository.createBatch();

        chunk.forEach(item => {
          const artId = generateId();
          const articleData: Article = {
            id: artId,
            site: targetSite,
            ref: item.reference,
            designation: item.designation,
            type: item.suggestedType,
            category: item.functionalCategory || 'NON_CATEGORISE',
            functionalCategory: item.functionalCategory,
            subCategory: item.subCategory,
            component: item.component,
            subComponent: item.subComponent,
            unit: item.unit || 'PIECE',
            quantity: 0,
            minStock: item.minStock || 5,
            location: 'Non assigné',
            price: item.price || 0,
            active: true,
            notes: item.notes,
            compatibility: item.compatibility,
            criticality: item.criticality || 'MOYENNE'
          };

          batch.set(doc(db, 'articles', artId), cleanObject(articleData));
          addedArticles.push(articleData);
          imported++;
        });

        await batch.commit();
      }

      // Update local store only after successful DB writes
      addedArticles.forEach(articleData => {
        useArticlesStore.getState().addArticleLocal(articleData);
      });

      return { success: true, imported, skipped };
    } catch (error: any) {
      logger.error('[importAllCatalogToArticles] Erreur:', error);
      return { success: false, error: error.message || "Erreur lors de l'importation du catalogue", imported: 0, skipped: 0 };
    }
  }
}

export const articlesService = new ArticlesService();
