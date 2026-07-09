import { collection, query, orderBy, getDocs, doc, setDoc, db, where, limit, QueryConstraint } from '../lib/db';
import { PriceChangeRecord } from '../types/priceHistory';
import { generateSecureUUID, logger } from '../lib/utils';

const COLLECTION_NAME = 'priceHistory';

export async function logPriceChange(record: Omit<PriceChangeRecord, 'id'>): Promise<void> {
  try {
    const id = generateSecureUUID();
    const fullRecord: PriceChangeRecord = {
      id,
      ...record,
    };
    await setDoc(doc(db, COLLECTION_NAME, id), fullRecord);
  } catch (error) {
    logger.error('[logPriceChange] Erreur:', error);
  }
}

export async function getPriceHistory(
  itemId?: string,
  category?: string,
  limitVal: number = 50
): Promise<PriceChangeRecord[]> {
  try {
    // Si aucun filtre n'est fourni, faire la requête triée de base
    if (!itemId && !category) {
      const constraints: QueryConstraint[] = [
        orderBy('changedAt', 'desc'),
        limit(limitVal)
      ];
      const q = query(collection(db, COLLECTION_NAME), ...constraints);
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PriceChangeRecord[];
    }

    // Si filtré par itemId ou category, on évite d'utiliser orderBy() dans Firestore
    // pour ne pas exiger d'index composite. On trie en mémoire.
    const constraints: QueryConstraint[] = [];
    if (itemId) {
      constraints.push(where('itemId', '==', itemId));
    } else if (category) {
      constraints.push(where('category', '==', category));
    }

    const q = query(collection(db, COLLECTION_NAME), ...constraints);
    const snap = await getDocs(q);
    const records = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PriceChangeRecord[];

    // Tri en mémoire par changedAt décroissant
    return records
      .sort((a, b) => {
        const dateA = new Date(a.changedAt || 0).getTime();
        const dateB = new Date(b.changedAt || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, limitVal);
  } catch (error) {
    logger.error('[getPriceHistory] Erreur:', error);
    return [];
  }
}
