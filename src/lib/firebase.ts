import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

/**
 * CONFIGURATION PRODUCTION - HYDRO-SUIVI-MAGASINIER
 * Mise à jour le: 16/05/2026
 */
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Forcer la langue en Français pour les popups
auth.languageCode = 'fr';

export default app;
