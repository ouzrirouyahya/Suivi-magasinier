import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * CONFIGURATION PRODUCTION - HYDRO-SUIVI-MAGASINIER
 * Mise à jour le: 16/05/2026
 */
const firebaseConfig = {
  apiKey: "AIzaSyCPZ4AvxoPaQzA2UqxJm9mNT5N65pGiPnw",
  authDomain: "hydro-suivi-magasinier.firebaseapp.com",
  projectId: "hydro-suivi-magasinier",
  storageBucket: "hydro-suivi-magasinier.firebasestorage.app",
  messagingSenderId: "940620142266",
  appId: "1:940620142266:web:08d5de9a8af30ad0f3d483",
  measurementId: "G-BE6CRY680D"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Forcer la langue en Français pour les popups
auth.languageCode = 'fr';

export default app;
