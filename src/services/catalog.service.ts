import { doc, setDoc, getDocs, collection, deleteDoc, db } from '../lib/db';
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

  async saveHydrominesItem(item: HydrominesCatalogItem): Promise<void> {
    await setDoc(doc(db, 'hydromines_catalog', item.id), cleanObject(item), { merge: true });
  },

  async getHydrominesCatalog(): Promise<HydrominesCatalogItem[]> {
    const snap = await getDocs(collection(db, 'hydromines_catalog'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as HydrominesCatalogItem);
  },

  async deleteHydrominesItem(id: string): Promise<void> {
    await deleteDoc(doc(db, 'hydromines_catalog', id));
  },

  async addPurchaseRequest(pr: PurchaseRequest): Promise<void> {
    const id = pr.id || generateId();
    await setDoc(doc(db, 'purchaseRequests', id), cleanObject({ ...pr, id }));
  },

  async updatePRStatus(id: string, status: any): Promise<void> {
    await setDoc(doc(db, 'purchaseRequests', id), { status }, { merge: true });
  }
};
