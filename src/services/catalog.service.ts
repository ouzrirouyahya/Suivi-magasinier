import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CatalogItem, HydrominesCatalogItem, PurchaseRequest } from '../types';
import { generateId, cleanObject } from '../lib/utils';

export const catalogService = {
  async saveCatalogItem(item: CatalogItem): Promise<void> {
    await setDoc(doc(db, 'catalog', item.id), cleanObject(item), { merge: true });
  },

  async deleteCatalogItem(id: string): Promise<void> {
    await setDoc(doc(db, 'catalog', id), { deleted: true }, { merge: true });
  },

  async saveHydrominesCatalogItem(item: HydrominesCatalogItem): Promise<void> {
    await setDoc(doc(db, 'hydromines_catalog', item.id), cleanObject(item), { merge: true });
  },

  async addPurchaseRequest(pr: PurchaseRequest): Promise<void> {
    const id = pr.id || generateId();
    await setDoc(doc(db, 'purchaseRequests', id), cleanObject({ ...pr, id }));
  },

  async updatePRStatus(id: string, status: any): Promise<void> {
    await setDoc(doc(db, 'purchaseRequests', id), { status }, { merge: true });
  }
};
