import { collection, query, orderBy, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PriceChangeRecord } from '../types/priceHistory';
import { generateSecureUUID } from '../lib/utils';

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
    console.error('[logPriceChange] Erreur:', error);
  }
}

export async function getPriceHistory(
  itemId?: string,
  category?: string,
  limitVal: number = 50
): Promise<PriceChangeRecord[]> {
  try {
    // We order by changedAt desc (single property order works out of the box in Firestore without composite index).
    // To remain 100% robust and bypass potential index issues when mixing where and orderBy,
    // we filter the results in memory.
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('changedAt', 'desc')
    );
    
    const snap = await getDocs(q);
    let records = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as PriceChangeRecord[];

    if (itemId) {
      records = records.filter(r => r.itemId === itemId);
    }
    if (category) {
      records = records.filter(r => r.category === category);
    }

    return records.slice(0, limitVal);
  } catch (error) {
    console.error('[getPriceHistory] Erreur:', error);
    return [];
  }
}
