// Couche d'abstraction Firebase Firestore
// Si l'API Firebase change, seul ce fichier est à modifier.
// Tous les hooks et services importent depuis ici, 
// jamais directement depuis 'firebase/firestore'.

export { 
  // Références
  collection,
  doc,
  // Lectures
  getDoc,
  getDocs,
  // Écritures
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  // Temps réel
  onSnapshot,
  onSnapshotsInSync,
  // Requêtes
  query,
  where,
  orderBy,
  limit,
  startAfter,
  startAt,
  endAt,
  or,
  // Transactions
  writeBatch,
  runTransaction,
  // Valeurs spéciales
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  deleteField,
  // Types
  Timestamp,
  FieldValue,
  type DocumentSnapshot,
  type QuerySnapshot,
  type QueryDocumentSnapshot,
  type Unsubscribe,
  type DocumentReference,
  type CollectionReference,
  type Query,
  type WriteBatch,
  type Transaction,
  type FieldPath,
} from 'firebase/firestore';

// Ré-exporter db depuis firebase.ts
export { db } from './firebase';
