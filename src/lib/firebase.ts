import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

/**
 * CONFIGURATION PRODUCTION - HYDRO-SUIVI-MAGASINIER
 * Mise à jour le: 16/05/2026
 */
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Activer la persistance hors-ligne Firestore (IndexedDB)
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Persistance Firestore : Plusieurs onglets ouverts, persistance active sur un seul.');
  } else if (err.code === 'unimplemented') {
    console.warn('Persistance Firestore : Le navigateur ne prend pas en charge la persistance.');
  } else {
    console.error('Erreur lors de l\'activation de la persistance Firestore:', err);
  }
});

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Forcer la langue en Français pour les popups
auth.languageCode = 'fr';

export default app;
