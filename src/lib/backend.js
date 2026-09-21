// Jednotné API pro data. Firebase (Auth + Firestore) když je nakonfigurovaný, jinak DEMO v localStorage.
//
// Firestore schéma:
//   users/{uid}/templates/{id}   vlastní šablony
//   users/{uid}/workouts/{id}    odcvičené tréninky (exercises[].sets[] = {weight, reps})
//   users/{uid}/prs/{exerciseKey} osobní rekord: {name, weight, reps, date}
//   users/{uid}/meta/main         edited main templates: {[profileId]: {groups, templates}}
//   users/{uid}/meta/profile      training profile: {id: 'krystof' | 'chiara'}
//   users/{uid}/meta/exercises    exercise library: {list: [{name, cat}], v: 2}  (without v = legacy custom additions)
import { isFirebaseConfigured, auth, db, provider } from './firebase.js';
import { clean } from './util.js';

const firebaseBackend = {
  mode: 'firebase',
  async onAuth(cb) {
    const { onAuthStateChanged, getRedirectResult } = await import('firebase/auth');
    getRedirectResult(auth).catch((e) => console.error('Redirect login:', e.code, e.message));
    return onAuthStateChanged(auth, (u) =>
      cb(u ? { uid: u.uid, name: u.displayName || '', email: u.email || '', photo: u.photoURL || '' } : null)
    );
  },
  async signIn() {
    const { signInWithPopup, signInWithRedirect } = await import('firebase/auth');
    // Appka spuštěná z plochy (standalone) → redirect, popup tam nefunguje
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (standalone) return signInWithRedirect(auth, provider);
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      // Instalovaná PWA na iOS občas blokuje popup → redirect
      if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'].includes(e.code)) {
        await signInWithRedirect(auth, provider);
      } else if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
        throw e;
      }
    }
  },
  async signOut() {
    const { signOut } = await import('firebase/auth');
    await signOut(auth);
  },
  data(uid) {
    const fs = import('firebase/firestore');
    const col = async (n) => (await fs).collection(db, 'users', uid, n);
    const ref = async (n, id) => (await fs).doc(db, 'users', uid, n, id);
    return {
      async loadAll() {
        const { getDocs, query, orderBy, limit } = await fs;
        const { getDoc } = await fs;
        const [t, w, p, ex, pr, mn] = await Promise.all([
          getDocs(await col('templates')),
          getDocs(query(await col('workouts'), orderBy('startedAt', 'desc'), limit(500))),
          getDocs(await col('prs')),
          getDoc(await ref('meta', 'exercises')),
          getDoc(await ref('meta', 'profile')),
          getDoc(await ref('meta', 'main')),
        ]);
        const prs = {};
        p.forEach((d) => (prs[d.id] = d.data()));
        return { templates: t.docs.map((d) => d.data()), workouts: w.docs.map((d) => d.data()), prs, library: ex.exists() ? ex.data() : null, profile: pr.exists() ? pr.data().id : null, main: mn.exists() ? mn.data() : {} };
      },
      async saveTemplate(tpl) {
        const { setDoc } = await fs;
        await setDoc(await ref('templates', tpl.id), clean(tpl));
      },
      async deleteTemplate(id) {
        const { deleteDoc } = await fs;
        await deleteDoc(await ref('templates', id));
      },
      async saveWorkout(w, prUpdates) {
        const { writeBatch } = await fs;
        const batch = writeBatch(db);
        batch.set(await ref('workouts', w.id), clean(w));
        for (const [key, pr] of Object.entries(prUpdates)) batch.set(await ref('prs', key), clean(pr));
        await batch.commit();
      },
      async deleteWorkout(id) {
        const { deleteDoc } = await fs;
        await deleteDoc(await ref('workouts', id));
      },
      async saveExercises(list) {
        const { setDoc } = await fs;
        await setDoc(await ref('meta', 'exercises'), { list: clean(list), v: 2 });
      },
      async saveProfile(id) {
        const { setDoc } = await fs;
        await setDoc(await ref('meta', 'profile'), { id });
      },
      // Edited main templates per profile; null = back to defaults
      async saveMain(profileId, cfg) {
        const { setDoc, deleteField } = await fs;
        await setDoc(await ref('meta', 'main'), { [profileId]: cfg ? clean(cfg) : deleteField() }, { merge: true });
      },
    };
  },
};

const LS = 'forge:demo';
const readLS = () => {
  try {
    return JSON.parse(localStorage.getItem(LS)) || { templates: [], workouts: [], prs: {}, exercises: [] };
  } catch {
    return { templates: [], workouts: [], prs: {}, exercises: [] };
  }
};
const writeLS = (d) => localStorage.setItem(LS, JSON.stringify(d));

const demoBackend = {
  mode: 'demo',
  async onAuth(cb) {
    cb(localStorage.getItem('forge:demo-user') ? { uid: 'demo', name: 'Demo', email: 'lokální režim', photo: '' } : null);
    demoBackend._cb = cb;
    return () => {};
  },
  async signIn() {
    localStorage.setItem('forge:demo-user', '1');
    demoBackend._cb?.({ uid: 'demo', name: 'Demo', email: 'lokální režim', photo: '' });
  },
  async signOut() {
    localStorage.removeItem('forge:demo-user');
    demoBackend._cb?.(null);
  },
  data() {
    return {
      async loadAll() {
        const d = readLS();
        return { ...d, main: d.main || {}, profile: d.profile || null, library: d.library || (d.exercises?.length ? { list: d.exercises } : null), workouts: [...d.workouts].sort((a, b) => b.startedAt - a.startedAt) };
      },
      async saveTemplate(t) {
        const d = readLS();
        d.templates = [...d.templates.filter((x) => x.id !== t.id), t];
        writeLS(d);
      },
      async deleteTemplate(id) {
        const d = readLS();
        d.templates = d.templates.filter((x) => x.id !== id);
        writeLS(d);
      },
      async saveWorkout(w, prUpdates) {
        const d = readLS();
        d.workouts = [...d.workouts.filter((x) => x.id !== w.id), w];
        d.prs = { ...d.prs, ...prUpdates };
        writeLS(d);
      },
      async deleteWorkout(id) {
        const d = readLS();
        d.workouts = d.workouts.filter((x) => x.id !== id);
        writeLS(d);
      },
      async saveExercises(list) {
        const d = readLS();
        d.library = { list, v: 2 };
        writeLS(d);
      },
      async saveProfile(id) {
        const d = readLS();
        d.profile = id;
        writeLS(d);
      },
      async saveMain(profileId, cfg) {
        const d = readLS();
        d.main = { ...(d.main || {}) };
        if (cfg) d.main[profileId] = cfg; else delete d.main[profileId];
        writeLS(d);
      },
    };
  },
};

export const backend = isFirebaseConfigured ? firebaseBackend : demoBackend;
