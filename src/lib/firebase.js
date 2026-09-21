import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

// Webový config Firebase je veřejný (posílá se do prohlížeče), data chrání firestore.rules.
// Hodnoty z env proměnných mají přednost; když chybí, použije se tento config.
const fallback = {
  apiKey: 'AIzaSyB4q3dQL9lap-hzBHMbeSYAENIz6IEHtFk',
  // Přihlašování běží přes vlastní doménu (proxy ve vercel.json), jinak ho iOS PWA z plochy rozbije.
  authDomain: typeof location !== 'undefined' && location.hostname.endsWith('.vercel.app') ? location.host : 'fitnessapp-88bd2.firebaseapp.com',
  projectId: 'fitnessapp-88bd2',
  storageBucket: 'fitnessapp-88bd2.firebasestorage.app',
  messagingSenderId: '587112214919',
  appId: '1:587112214919:web:54e64ff3b47c16fd516322',
};
const env = import.meta.env;
const cfg = {
  apiKey: env.VITE_FIREBASE_API_KEY || fallback.apiKey,
  authDomain: fallback.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || fallback.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || fallback.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || fallback.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || fallback.appId,
};

export const isFirebaseConfigured = Boolean(cfg.apiKey && cfg.projectId && cfg.appId);

let app, auth, db, provider;
if (isFirebaseConfigured) {
  app = initializeApp(cfg);
  auth = getAuth(app);
  provider = new GoogleAuthProvider();
  // Offline cache: zápis série v posilovně bez signálu se doplní na server později.
  db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
}
export { auth, db, provider };
