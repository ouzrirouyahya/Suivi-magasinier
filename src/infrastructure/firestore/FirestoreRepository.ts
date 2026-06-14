import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  QueryConstraint,
  DocumentReference,
  DocumentData,
  Query,
  runTransaction,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/utils';

export class FirestoreRepository {
  /**
   * Fetch a single document by path
   */
  async getDocument<T = DocumentData>(path: string, id: string): Promise<T | null> {
    const docRef = doc(db, path, id);
    try {
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as T;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${path}/${id}`);
      return null;
    }
  }

  /**
   * Fetch a collection or query with constraints
   */
  async getCollection<T = DocumentData>(path: string, ...constraints: QueryConstraint[]): Promise<T[]> {
    const colRef = collection(db, path);
    const q = query(colRef, ...constraints);
    try {
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as T);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  }

  /**
   * Build a direct query for subscriptions
   */
  buildQuery(path: string, ...constraints: QueryConstraint[]): Query<DocumentData> {
    const colRef = collection(db, path);
    return query(colRef, ...constraints);
  }

  /**
   * Create or overwrite a document at a specific path
   */
  async write(path: string, id: string, data: any): Promise<void> {
    const docRef = doc(db, path, id);
    try {
      await setDoc(docRef, data);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${id}`);
    }
  }

  /**
   * Update fields of a document at a specific path
   */
  async update(path: string, id: string, data: any): Promise<void> {
    const docRef = doc(db, path, id);
    try {
      await updateDoc(docRef, data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${path}/${id}`);
    }
  }

  /**
   * Delete a document
   */
  async delete(path: string, id: string): Promise<void> {
    const docRef = doc(db, path, id);
    try {
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
    }
  }

  /**
   * Run a custom transaction block
   */
  async runTransactionBlock<T>(updateFunction: (transaction: any) => Promise<T>): Promise<T> {
    try {
      return await runTransaction(db, updateFunction);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'transaction');
      throw error;
    }
  }

  /**
   * Create a Firestore write batch
   */
  createBatch() {
    return writeBatch(db);
  }
}

export const firestoreRepository = new FirestoreRepository();
