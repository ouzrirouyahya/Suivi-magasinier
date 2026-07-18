import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

// Fonction helper : échoue clairement si variable manquante
const requireEnv = (key: string): string => {
  const val = import.meta.env[key];
  if (!val || val.trim() === '') {
    // En développement : erreur claire dans la console
    console.error(
      `[Firebase] ❌ Variable d'environnement manquante : ${key}\n` +
      `Créez un fichier .env.local à la racine avec :\n` +
      `${key}=votre_valeur_ici`
    );
    // Retourner une string vide pour ne pas crasher le typage
    // Firebase échouera à l'init et l'erreur sera visible
    return '';
  }
  return val;
};

const firebaseConfig = {
  apiKey: requireEnv('VITE_FIREBASE_API_KEY'),
  projectId: requireEnv('VITE_FIREBASE_PROJECT_ID'),
  appId: requireEnv('VITE_FIREBASE_APP_ID'),
  authDomain: requireEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  storageBucket: requireEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: requireEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
};

const rawDatabaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID;
const DATABASE_ID = (rawDatabaseId && rawDatabaseId.trim() !== '' && rawDatabaseId.trim() !== '(default)') 
  ? rawDatabaseId.trim() 
  : 'ai-studio-8a211b3e-d9c6-4439-b61e-9282b9488046';

const app = initializeApp(firebaseConfig);

// Firebase v12 : persistance offline via initializeFirestore
// persistentMultipleTabManager : plusieurs onglets partagent le cache
// sans conflit ni warning "failed-precondition"
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, DATABASE_ID);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
auth.languageCode = 'fr';

const isDev = import.meta.env.DEV;
const localLogger = {
  log: (...args: any[]) => isDev && console.log(...args),
  warn: (...args: any[]) => isDev && console.warn(...args),
};

// TODO: Réactiver App Check après configuration complète
// dans Google Cloud Console et Firebase Console
/*
if (typeof window !== 'undefined' && import.meta.env.VITE_RECAPTCHA_KEY) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(import.meta.env.VITE_RECAPTCHA_KEY),
      isTokenAutoRefreshEnabled: true
    });
    localLogger.log('[Firebase] App Check initialisé avec succès.');
  } catch (err) {
    localLogger.warn('[Firebase] Impossible d\'initialiser App Check:', err);
  }
}
*/

export default app;
export { 
  onAuthStateChanged,
  signOut,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  type User,
  type UserCredential
} from 'firebase/auth';
