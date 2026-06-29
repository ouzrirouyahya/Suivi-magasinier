import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCPZ4AvxoPaQzA2UqxJm9mNT5N65pGiPnw",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "hydro-suivi-magasinier",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:940620142266:web:073720dd0109b8f9f3d483",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "hydro-suivi-magasinier.firebaseapp.com",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "hydro-suivi-magasinier.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "940620142266",
};

const DATABASE_ID = import.meta.env.VITE_FIREBASE_DATABASE_ID || "ai-studio-8a211b3e-d9c6-4439-b61e-9282b9488046";

const app = initializeApp(firebaseConfig);

// Firebase v12 : persistance offline via initializeFirestore
// persistentMultipleTabManager : plusieurs onglets partagent le cache
// sans conflit ni warning "failed-precondition"
const dbId = DATABASE_ID && DATABASE_ID !== '(default)' && DATABASE_ID.trim() !== '' ? DATABASE_ID : undefined;
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, dbId);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
auth.languageCode = 'fr';

// Activation sécurisée de Firebase App Check avec reCAPTCHA Enterprise
if (typeof window !== 'undefined' && import.meta.env.VITE_RECAPTCHA_KEY) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(import.meta.env.VITE_RECAPTCHA_KEY),
      isTokenAutoRefreshEnabled: true
    });
    console.log('[Firebase] App Check initialisé avec succès.');
  } catch (err) {
    console.warn('[Firebase] Impossible d\'initialiser App Check:', err);
  }
}

export default app;
