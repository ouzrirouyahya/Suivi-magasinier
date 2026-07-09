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
    const constraints: QueryConstraint[] = [
      orderBy('changedAt', 'desc'),
      limit(limitVal)
    ];
    
    // Filtrer dans Firestore si itemId ou category fourni
    if (itemId) {
      constraints.unshift(where('itemId', '==', itemId));
    } else if (category) {
      constraints.unshift(where('category', '==', category));
    }
    
    const q = query(collection(db, COLLECTION_NAME), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PriceChangeRecord[];
  } catch (error) {
    logger.error('[getPriceHistory] Erreur:', error);
    return [];
  }
}
