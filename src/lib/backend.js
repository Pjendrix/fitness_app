// Jednotné API pro data. Firebase (Auth + Firestore), nebo DEMO v localStorage (VITE_DEMO=1).
//
// Firestore schéma:
//   users/{uid}/templates/{id}    vlastní šablony
//   users/{uid}/workouts/{id}     odcvičené tréninky (exercises[].sets[] = {weight, reps, time?})
//   users/{uid}/prs/{exerciseKey} osobní rekord: {name, weight, reps, time?, date}
//   users/{uid}/meta/main         hlavní šablony účtu: {own: {groups, templates}} (+ starší {krystof|chiara} jako záloha)
//   users/{uid}/meta/profile      startovní split: {id: 'ppl' | 'ul' | 'fb'} (dříve 'krystof' | 'chiara')
//   users/{uid}/meta/settings     týdenní cíl, připnuté cviky, vzhled {tint, strength, accent}
//   access/{email}                povolené účty navíc k FOUNDERS (spravuje admin)
//   users/{uid}/meta/exercises    knihovna cviků: {list: [{name, cat}], v: 2}
import { getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut as fbSignOut } from 'firebase/auth';
import { collection, deleteDoc, deleteField, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, setDoc, writeBatch } from 'firebase/firestore';
import { isFirebaseConfigured, auth, db, provider } from './firebase.js';
import { isFounder, normEmail } from './access.js';
import { clean } from './util.js';
import { generateDemo } from './demoData.js';

export const HISTORY_LIMIT = 1000;
const toUser = (u) => ({ uid: u.uid, name: u.displayName || '', email: u.email || '', photo: u.photoURL || '' });

const firebaseBackend = {
  mode: 'firebase',
  onAuth(cb, onDenied) {
    getRedirectResult(auth).catch((e) => console.error('Redirect login:', e.code, e.message));
    return onAuthStateChanged(auth, async (u) => {
      if (!u) return cb(null);
      if (!isFounder(u.email)) {
        // Přístup přidaný adminem: vlastní dokument access/{email} smí uživatel číst
        let ok;
        try { ok = (await getDoc(doc(db, 'access', normEmail(u.email)))).exists(); }
        catch (e) { ok = e?.code !== 'permission-denied'; } // offline apod. → pustit dál, data stejně chrání rules
        if (!ok) {
          onDenied?.(u.email);
          fbSignOut(auth).catch(() => {});
          cb(null);
          return;
        }
      }
      cb(toUser(u));
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
  // Správa přístupů (jen admin – vynucují rules)
  access: {
    async list() { const snap = await getDocs(collection(db, 'access')); return snap.docs.map((d) => d.data()).sort((a, b) => a.email.localeCompare(b.email)); },
    add: (email, name = '') => setDoc(doc(db, 'access', normEmail(email)), { email: normEmail(email), name: String(name).slice(0, 60), addedAt: Date.now() }),
    remove: (email) => deleteDoc(doc(db, 'access', normEmail(email))),
  },
  data(uid) {
    const col = (n) => collection(db, 'users', uid, n);
    const ref = (n, id) => doc(db, 'users', uid, n, id);
    // Změny rekordů {key: pr | null} do batche (null = rekord smazat)
    const putPrs = (batch, changes) => {
      for (const [key, pr] of Object.entries(changes)) {
        if (pr) batch.set(ref('prs', key), clean(pr));
        else batch.delete(ref('prs', key));
      }
    };
    return {
      // Šablony, rekordy a nastavení živě (D1). Z offline cache hned – bez čekání až ~10 s na server při slabém signálu –
      // a změny z jiného zařízení se projeví bez reloadu. Na zařízení, které ještě nikdy nemělo data ze serveru,
      // se na server počká (prázdná cache ≠ prázdný účet, jinak by se ukázal výběr splitu a mohl přepsat šablony).
      subscribeMeta(cb, onError) {
        const syncedKey = `forge:metaSynced:${uid}`;
        let trustCache = false;
        try { trustCache = localStorage.getItem(syncedKey) === '1'; } catch { /* ignore */ }
        const parts = {};
        const names = ['templates', 'prs', 'exercises', 'profile', 'main', 'settings'];
        let ready = false;
        const emit = () => {
          if (!ready) {
            if (!names.every((n) => parts[n] && (parts[n].server || trustCache))) return;
            ready = true;
          }
          const server = names.every((n) => parts[n].server);
          if (server) { try { localStorage.setItem(syncedKey, '1'); } catch { /* ignore */ } }
          cb({
            templates: parts.templates.value, prs: parts.prs.value, library: parts.exercises.value,
            profile: parts.profile.value, main: parts.main.value, settings: parts.settings.value,
          }, { fromCache: !server });
        };
        const listen = (name, src, map, fallback) => onSnapshot(src, { includeMetadataChanges: true },
          (snap) => { parts[name] = { value: map(snap), server: !snap.metadata.fromCache }; emit(); },
          (e) => {
            parts[name] = { value: fallback, server: true };
            if (name !== 'settings') onError?.(e); // settings mohou starší rules odmítnout – appka jede dál bez nich
            emit();
          });
        const unsubs = [
          listen('templates', col('templates'), (s) => s.docs.map((d) => d.data()), []),
          listen('prs', col('prs'), (s) => { const o = {}; s.forEach((d) => (o[d.id] = d.data())); return o; }, {}),
          listen('exercises', ref('meta', 'exercises'), (s) => (s.exists() ? s.data() : null), null),
          listen('profile', ref('meta', 'profile'), (s) => (s.exists() ? s.data().id : null), null),
          listen('main', ref('meta', 'main'), (s) => (s.exists() ? s.data() : {}), {}),
          listen('settings', ref('meta', 'settings'), (s) => (s.exists() ? s.data() : null), null),
        ];
        return () => unsubs.forEach((u) => u());
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
      // Trénink (nový i upravený) + změněné rekordy ({key: pr | null}) atomicky v jednom batchi
      saveWorkout(w, prUpdates = {}) {
        const batch = writeBatch(db);
        batch.set(ref('workouts', w.id), clean(w));
        putPrs(batch, prUpdates);
        return batch.commit();
      },
      // Smazání tréninku + přepočtené rekordy ({key: pr | null}) atomicky
      deleteWorkout(id, prChanges = {}) {
        const batch = writeBatch(db);
        batch.delete(ref('workouts', id));
        putPrs(batch, prChanges);
        return batch.commit();
      },
      // Víc tréninků najednou (přejmenování cviku napříč historií). Batch má limit 500 zápisů → po 400,
      // změny rekordů jdou s prvním batchem.
      async saveWorkouts(list, prChanges = {}) {
        const chunks = [];
        for (let i = 0; i < list.length; i += 400) chunks.push(list.slice(i, i + 400));
        if (!chunks.length) chunks.push([]);
        await Promise.all(chunks.map((part, i) => {
          const batch = writeBatch(db);
          for (const w of part) batch.set(ref('workouts', w.id), clean(w));
          if (i === 0) putPrs(batch, prChanges);
          return batch.commit();
        }));
      },
      // Jen rekordy ({key: pr | null}) – srovnání s historií
      applyPrChanges(changes) {
        const batch = writeBatch(db);
        putPrs(batch, changes);
        return batch.commit();
      },
      saveExercises: (list) => setDoc(ref('meta', 'exercises'), { list: clean(list), v: 2 }),
      saveProfile: (id) => setDoc(ref('meta', 'profile'), { id }),
      saveSettings: (s) => setDoc(ref('meta', 'settings'), s, { merge: true }),
      // Hlavní šablony účtu (klíč own); starší klíče krystof/chiara zůstávají jako záloha
      saveMain: (cfg) => setDoc(ref('meta', 'main'), { own: cfg ? clean(cfg) : deleteField() }, { merge: true }),
    };
  },
};

// ——— DEMO (localStorage, bez přihlášení) ———
const LS = 'forge:demo';
const empty = () => ({ templates: [], workouts: [], prs: {}, exercises: [] });
const readLS = () => { try { return JSON.parse(localStorage.getItem(LS)) || empty(); } catch { return empty(); } };
const writeLS = (d) => localStorage.setItem(LS, JSON.stringify(d));
const DEMO_USER = { uid: 'demo', name: 'Demo', email: '', photo: '' };
const listeners = new Set();
const emit = () => { const w = [...readLS().workouts].sort((a, b) => b.startedAt - a.startedAt); listeners.forEach((f) => f(w, { pending: false, fromCache: false })); };
const edit = (fn) => { const d = readLS(); fn(d); writeLS(d); };
const putDemoPrs = (d, changes) => { for (const [k, v] of Object.entries(changes)) { if (v) d.prs[k] = v; else delete d.prs[k]; } };

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
      subscribeMeta(cb) {
        const d = readLS();
        let live = true;
        Promise.resolve().then(() => live && cb({ templates: d.templates, prs: d.prs, main: d.main || {}, settings: d.settings || null, profile: d.profile || null, library: d.library || (d.exercises?.length ? { list: d.exercises } : null) }, { fromCache: false }));
        return () => { live = false; };
      },
      subscribeWorkouts(cb) { listeners.add(cb); emit(); return () => listeners.delete(cb); },
      async saveTemplate(t) { edit((d) => { d.templates = [...d.templates.filter((x) => x.id !== t.id), t]; }); },
      async deleteTemplate(id) { edit((d) => { d.templates = d.templates.filter((x) => x.id !== id); }); },
      async saveWorkout(w, prUpdates = {}) { edit((d) => { d.workouts = [...d.workouts.filter((x) => x.id !== w.id), w]; putDemoPrs(d, prUpdates); }); emit(); },
      async deleteWorkout(id, prChanges = {}) {
        edit((d) => {
          d.workouts = d.workouts.filter((x) => x.id !== id);
          putDemoPrs(d, prChanges);
        });
        emit();
      },
      async saveWorkouts(list, prChanges = {}) {
        const byId = new Map(list.map((w) => [w.id, w]));
        edit((d) => { d.workouts = d.workouts.map((x) => byId.get(x.id) || x); putDemoPrs(d, prChanges); });
        emit();
      },
      async applyPrChanges(ch) { edit((d) => { putDemoPrs(d, ch); }); },
      async saveExercises(list) { edit((d) => { d.library = { list, v: 2 }; }); },
      async saveProfile(id) { edit((d) => { d.profile = id; }); },
      async saveSettings(s) { edit((d) => { d.settings = { ...(d.settings || {}), ...s }; }); },
      async saveMain(cfg) { edit((d) => { d.main = { ...(d.main || {}) }; if (cfg) d.main.own = cfg; else delete d.main.own; }); },
    };
  },
};

// ——— Veřejné demo (tlačítko „Demo“ na přihlášení) ———
// Na Firebase vůbec nesahá: data jsou jen v tomto prohlížeči (localStorage) a zůstávají tam.
const SANDBOX = 'forge:sandbox';
const real = isFirebaseConfigured ? firebaseBackend : demoBackend;
let sandbox = isFirebaseConfigured && (() => { try { return localStorage.getItem(SANDBOX) === '1'; } catch { return false; } })();
let authCb = null;
const seedIfEmpty = () => { if (!localStorage.getItem(LS)) writeLS(generateDemo()); };

export const backend = {
  get mode() { return sandbox ? 'demo' : real.mode; },
  get sandbox() { return sandbox; },
  onAuth(cb, onDenied) {
    authCb = cb;
    const unsub = real.onAuth((u) => { if (!sandbox) cb(u); }, onDenied);
    if (sandbox) { seedIfEmpty(); cb(DEMO_USER); }
    return unsub;
  },
  signIn: () => real.signIn(),
  async signOut() {
    if (sandbox) { sandbox = false; localStorage.removeItem(SANDBOX); authCb?.(null); return; }
    return real.signOut();
  },
  async startDemo() {
    seedIfEmpty();
    localStorage.setItem(SANDBOX, '1');
    sandbox = true;
    authCb?.(DEMO_USER);
  },
  // Nová ukázková data (přepíše změny v demu)
  resetDemo() { writeLS(generateDemo()); },
  data(uid) { return sandbox ? demoBackend.data(uid) : real.data(uid); },
  get access() { return !sandbox && real.access ? real.access : null; },
};
