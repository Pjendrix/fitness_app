import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

// Webový config Firebase je veřejný (posílá se do každého prohlížeče). Data chrání firestore.rules
// (allowlist + validace), API klíč omezení v Google Cloud Console a App Check.
const config = {
  apiKey: 'AIzaSyB4q3dQL9lap-hzBHMbeSYAENIz6IEHtFk',
  // Přihlašování přes vlastní doménu (proxy /__/auth ve vercel.json), jinak ho iOS PWA z plochy rozbije.
  authDomain: typeof location !== 'undefined' && location.hostname.endsWith('.vercel.app') ? location.host : 'fitnessapp-88bd2.firebaseapp.com',
  projectId: 'fitnessapp-88bd2',
  storageBucket: 'fitnessapp-88bd2.firebasestorage.app',
  messagingSenderId: '587112214919',
  appId: '1:587112214919:web:54e64ff3b47c16fd516322',
};

// reCAPTCHA Enterprise site key z Firebase Console → App Check (viz INSTRUKCE.md). Prázdné = App Check vypnutý.
const APP_CHECK_SITE_KEY = '';

// Lokální DEMO bez Firebase: `VITE_DEMO=1 npm run dev`
export const isFirebaseConfigured = import.meta.env.VITE_DEMO !== '1';

let app, auth, db, provider;
if (isFirebaseConfigured) {
  app = initializeApp(config);
  if (APP_CHECK_SITE_KEY) {
    // Na localhostu se vypíše debug token do konzole – zaregistruj ho v App Check → Manage debug tokens.
    if (location.hostname === 'localhost') self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(APP_CHECK_SITE_KEY), isTokenAutoRefreshEnabled: true });
  }
  auth = getAuth(app);
  provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  // Offline cache: zápis v posilovně bez signálu se odešle, až bude připojení.
  db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
}
export { auth, db, provider };
