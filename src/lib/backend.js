// Jednotné API pro data. Firebase (Auth + Firestore), nebo DEMO v localStorage (VITE_DEMO=1).
//
// Firestore schéma:
//   users/{uid}/templates/{id}    vlastní šablony
//   users/{uid}/workouts/{id}     odcvičené tréninky (exercises[].sets[] = {weight, reps, time?})
//   users/{uid}/prs/{exerciseKey} osobní rekord: {name, weight, reps, time?, date}
//   users/{uid}/meta/main         upravené hlavní šablony: {[profileId]: {groups, templates}}
//   users/{uid}/meta/profile      tréninkový profil: {id: 'krystof' | 'chiara'}
//   users/{uid}/meta/exercises    knihovna cviků: {list: [{name, cat}], v: 2}
import { getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut as fbSignOut } from 'firebase/auth';
import { collection, deleteDoc, deleteField, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, setDoc, writeBatch } from 'firebase/firestore';
import { isFirebaseConfigured, auth, db, provider } from './firebase.js';
import { isAllowed } from './access.js';
import { clean } from './util.js';

export const HISTORY_LIMIT = 1000;
const toUser = (u) => ({ uid: u.uid, name: u.displayName || '', email: u.email || '', photo: u.photoURL || '' });

const firebaseBackend = {
  mode: 'firebase',
  onAuth(cb, onDenied) {
    getRedirectResult(auth).catch((e) => console.error('Redirect login:', e.code, e.message));
    return onAuthStateChanged(auth, (u) => {
      if (u && !isAllowed(u.email)) {
        onDenied?.(u.email);
        fbSignOut(auth).catch(() => {});
        cb(null);
        return;
      }
      cb(u ? toUser(u) : null);
    });
  },
  async signIn() {
    // Appka spuštěná z plochy (standalone) → redirect, popup tam nefunguje
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (standalone) return signInWithRedirect(auth, provider);
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'].includes(e.code)) await signInWithRedirect(auth, provider);
      else if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') throw e;
    }
  },
  signOut: () => fbSignOut(auth),
  data(uid) {
    const col = (n) => collection(db, 'users', uid, n);
    const ref = (n, id) => doc(db, 'users', uid, n, id);
    return {
      async loadAll() {
        const [t, p, ex, pr, mn] = await Promise.all([
          getDocs(col('templates')), getDocs(col('prs')),
          getDoc(ref('meta', 'exercises')), getDoc(ref('meta', 'profile')), getDoc(ref('meta', 'main')),
        ]);
        const prs = {};
        p.forEach((d) => (prs[d.id] = d.data()));
        return { templates: t.docs.map((d) => d.data()), prs, library: ex.exists() ? ex.data() : null, profile: pr.exists() ? pr.data().id : null, main: mn.exists() ? mn.data() : {} };
      },
      // Živý odběr historie: data z offline cache hned, pak ze serveru; metadata říkají, co ještě čeká na odeslání.
      subscribeWorkouts(cb, onError) {
        const q = query(col('workouts'), orderBy('startedAt', 'desc'), limit(HISTORY_LIMIT));
        return onSnapshot(q, { includeMetadataChanges: true },
          (snap) => cb(snap.docs.map((d) => d.data()), { pending: snap.metadata.hasPendingWrites, fromCache: snap.metadata.fromCache }),
          onError);
      },
      saveTemplate: (tpl) => setDoc(ref('templates', tpl.id), clean(tpl)),
      deleteTemplate: (id) => deleteDoc(ref('templates', id)),
      // Trénink + změněné rekordy atomicky v jednom batchi
      saveWorkout(w, prUpdates = {}) {
        const batch = writeBatch(db);
        batch.set(ref('workouts', w.id), clean(w));
        for (const [key, pr] of Object.entries(prUpdates)) batch.set(ref('prs', key), clean(pr));
        return batch.commit();
      },
      // Smazání tréninku + přepočtené rekordy ({key: pr | null}) atomicky
      deleteWorkout(id, prChanges = {}) {
        const batch = writeBatch(db);
        batch.delete(ref('workouts', id));
        for (const [key, pr] of Object.entries(prChanges)) {
          if (pr) batch.set(ref('prs', key), clean(pr));
          else batch.delete(ref('prs', key));
        }
        return batch.commit();
      },
      saveExercises: (list) => setDoc(ref('meta', 'exercises'), { list: clean(list), v: 2 }),
      saveProfile: (id) => setDoc(ref('meta', 'profile'), { id }),
      // Upravené hlavní šablony pro profil; null = zpět na výchozí
      saveMain: (profileId, cfg) => setDoc(ref('meta', 'main'), { [profileId]: cfg ? clean(cfg) : deleteField() }, { merge: true }),
    };
  },
};

// ——— DEMO (localStorage, bez přihlášení) ———
const LS = 'forge:demo';
const empty = () => ({ templates: [], workouts: [], prs: {}, exercises: [] });
const readLS = () => { try { return JSON.parse(localStorage.getItem(LS)) || empty(); } catch { return empty(); } };
const writeLS = (d) => localStorage.setItem(LS, JSON.stringify(d));
const DEMO_USER = { uid: 'demo', name: 'Demo', email: 'lokální režim', photo: '' };
const listeners = new Set();
const emit = () => { const w = [...readLS().workouts].sort((a, b) => b.startedAt - a.startedAt); listeners.forEach((f) => f(w, { pending: false, fromCache: false })); };
const edit = (fn) => { const d = readLS(); fn(d); writeLS(d); };

const demoBackend = {
  mode: 'demo',
  onAuth(cb) {
    demoBackend._cb = cb;
    cb(localStorage.getItem('forge:demo-user') ? DEMO_USER : null);
    return () => {};
  },
  async signIn() { localStorage.setItem('forge:demo-user', '1'); demoBackend._cb?.(DEMO_USER); },
  async signOut() { localStorage.removeItem('forge:demo-user'); demoBackend._cb?.(null); },
  data() {
    return {
      async loadAll() {
        const d = readLS();
        return { templates: d.templates, prs: d.prs, main: d.main || {}, profile: d.profile || null, library: d.library || (d.exercises?.length ? { list: d.exercises } : null) };
      },
      subscribeWorkouts(cb) { listeners.add(cb); emit(); return () => listeners.delete(cb); },
      async saveTemplate(t) { edit((d) => { d.templates = [...d.templates.filter((x) => x.id !== t.id), t]; }); },
      async deleteTemplate(id) { edit((d) => { d.templates = d.templates.filter((x) => x.id !== id); }); },
      async saveWorkout(w, prUpdates = {}) { edit((d) => { d.workouts = [...d.workouts.filter((x) => x.id !== w.id), w]; d.prs = { ...d.prs, ...prUpdates }; }); emit(); },
      async deleteWorkout(id, prChanges = {}) {
        edit((d) => {
          d.workouts = d.workouts.filter((x) => x.id !== id);
          for (const [k, v] of Object.entries(prChanges)) { if (v) d.prs[k] = v; else delete d.prs[k]; }
        });
        emit();
      },
      async saveExercises(list) { edit((d) => { d.library = { list, v: 2 }; }); },
      async saveProfile(id) { edit((d) => { d.profile = id; }); },
      async saveMain(profileId, cfg) { edit((d) => { d.main = { ...(d.main || {}) }; if (cfg) d.main[profileId] = cfg; else delete d.main[profileId]; }); },
    };
  },
};

export const backend = isFirebaseConfigured ? firebaseBackend : demoBackend;
