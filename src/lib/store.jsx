import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { backend, HISTORY_LIMIT } from './backend.js';
import { profileOf } from '../data/defaultTemplates.js';
import { defaultTypeOf, EXERCISES, modernName, normCat } from '../data/exercises.js';
import { better, exKey, firstNum, hasValue, isDone, LIMITS, planLabel, sanitizeName, sanitizeSet, uid } from './util.js';
import { applyChanges, applyWorkout, changesAfterDelete, recomputeKeys } from './records.js';
import { getRestDefault } from './rest.js';
import { t } from './i18n.js';
import { INFO_KEYS } from '../data/infoKeys.js';

// Tři oddělené kontexty: psaní v aktivním tréninku nepřekresluje zbytek appky.
const DataCtx = createContext(null);
const SessionCtx = createContext(null);
const ToastCtx = createContext(null);
export const useStore = () => useContext(DataCtx);
export const useSession = () => useContext(SessionCtx);
export const useToast = () => useContext(ToastCtx);

// ——— Draft rozdělaného tréninku (per uživatel) ———
const draftKey = (u) => `forge:active:${u}`;
const LEGACY_DRAFT = 'forge:active';
const withIds = (a) =>
  a && Array.isArray(a.exercises)
    ? { ...a, exercises: a.exercises.map((e) => ({ ...e, id: e.id || uid(), sets: (e.sets || []).map((s) => ({ ...s, id: s.id || uid() })) })) }
    : null;
const loadDraft = (u) => {
  try {
    let raw = localStorage.getItem(draftKey(u));
    if (!raw && localStorage.getItem(LEGACY_DRAFT)) {
      // Jednorázová migrace starého sdíleného klíče na prvního přihlášeného
      raw = localStorage.getItem(LEGACY_DRAFT);
      localStorage.removeItem(LEGACY_DRAFT);
    }
    return withIds(JSON.parse(raw));
  } catch {
    return null;
  }
};

// Staré české názvy cviků → anglické (historie, PB i šablony se dál párují).
const migrateEx = (e) => {
  const name = modernName(e.name);
  return name === e.name ? e : { ...e, name, key: exKey(name) };
};
const migrateWorkout = (w) => ({ ...w, exercises: (w.exercises || []).map(migrateEx) });
const migratePrs = (prs) => {
  const out = {};
  for (const p of Object.values(prs)) {
    const name = modernName(p.name);
    const key = exKey(name);
    if (!out[key] || better(p, out[key])) out[key] = { ...p, name };
  }
  return out;
};
const migrateTemplate = (tpl) => ({ ...tpl, exercises: tpl.exercises.map((e) => ({ ...e, name: modernName(e.name) })) });
const loadLibrary = (d) => {
  if (!d) return EXERCISES;
  const list = (d.list || []).map((e) => ({ name: modernName(e.name), cat: normCat(e.cat), ...(e.type === 'time' ? { type: 'time' } : {}), ...(e.db ? { db: e.db } : {}) }));
  if (d.v === 2) return list;
  const have = new Set(EXERCISES.map((e) => exKey(e.name)));
  return [...EXERCISES, ...list.filter((e) => !have.has(exKey(e.name)))];
};
const byStart = (list) => [...list].sort((a, b) => b.startedAt - a.startedAt);
const newSet = (s = {}) => ({ id: uid(), weight: String(s.weight || ''), reps: String(s.reps || ''), time: String(s.time || ''), done: false });

const toLibEntry = (ex) => {
  const cat = normCat(ex.cat);
  return { name: sanitizeName(ex.name), cat, ...(ex.type === 'time' || (!ex.type && cat === 'cardio') ? { type: 'time' } : {}), ...(ex.db ? { db: String(ex.db).slice(0, 120) } : {}) };
};

export function StoreProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = načítání, null = odhlášen
  const [denied, setDenied] = useState(null); // e-mail účtu bez přístupu
  const [metaLoading, setMetaLoading] = useState(false);
  const [workoutsReady, setWorkoutsReady] = useState(false);
  const [custom, setCustom] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [prs, setPrs] = useState({});
  const [library, setLibrary] = useState(EXERCISES);
  const [profile, setProfileState] = useState(null);
  const [mainStore, setMainStore] = useState({});
  const [undoStack, setUndoStack] = useState([]);
  const [active, setActive] = useState(null);
  const [toast, setToast] = useState(null);
  const [sync, setSync] = useState({ pending: false, fromCache: false });
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [rest, setRest] = useState(null); // {until, total}
  const [weeklyGoal, setWeeklyGoalState] = useState(3);

  const api = useMemo(() => (user ? backend.data(user.uid) : null), [user]);

  // ——— Toast (volitelně s akcí, např. „Zpět“) ———
  const toastTimer = useRef(null);
  const notify = useCallback((msg, opts = {}) => {
    clearTimeout(toastTimer.current);
    const id = Date.now() + Math.random();
    setToast({ msg, id, action: opts.action || null });
    toastTimer.current = setTimeout(() => setToast((x) => (x?.id === id ? null : x)), opts.duration || (opts.action ? 5000 : 3000));
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);
  const fail = useCallback((key) => (e) => { console.error(e); notify(t(key, { m: e?.code || e?.message || '?' })); }, [notify]);

  // ——— Auth ———
  useEffect(() => backend.onAuth((u) => { setUser(u); if (u) setDenied(null); }, setDenied), []);

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // ——— Data ———
  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    setMetaLoading(true);
    setWorkoutsReady(false);
    api.loadAll()
      .then((d) => {
        if (cancelled) return;
        setCustom(d.templates.map(migrateTemplate));
        setPrs(migratePrs(d.prs));
        setLibrary(loadLibrary(d.library));
        setProfileState(d.profile || null);
        setMainStore(d.main || {});
        const cached = parseInt(localStorage.getItem(`forge:goal:${user.uid}`), 10);
        setWeeklyGoalState(d.settings?.weeklyGoal || cached || 3);
      })
      .catch(fail('err.load'))
      .finally(() => !cancelled && setMetaLoading(false));
    const unsub = api.subscribeWorkouts(
      (list, meta) => { if (cancelled) return; setWorkouts(list.map(migrateWorkout)); setSync(meta); setWorkoutsReady(true); },
      (e) => { fail('err.load')(e); setWorkoutsReady(true); }
    );
    return () => { cancelled = true; unsub(); };
  }, [api, fail]); // eslint-disable-line react-hooks/exhaustive-deps

  // ——— Srovnání rekordů s historií (jednou po načtení ze serveru) ———
  // Opraví rekordy, které zůstaly po tréninku smazaném dřív (např. ve starší verzi appky),
  // a doplní chybějící. Když je historie na limitu, nesrovnává (starší tréninky nejsou načtené).
  const reconciled = useRef(false);
  useEffect(() => { reconciled.current = false; }, [api]);
  useEffect(() => {
    if (!api || reconciled.current || metaLoading || !workoutsReady || sync.fromCache) return;
    reconciled.current = true;
    if (workouts.length >= HISTORY_LIMIT) return;
    const keys = new Set([...Object.keys(prs), ...workouts.flatMap((w) => w.exercises.map((e) => e.key))]);
    const changes = recomputeKeys(keys, workouts, prs);
    if (!Object.keys(changes).length) return;
    setPrs((p) => applyChanges(p, changes));
    api.applyPrChanges(changes).catch(fail('err.save'));
  }, [api, metaLoading, workoutsReady, sync.fromCache, workouts, prs, fail]);

  // ——— Draft: načíst pro přihlášeného, ukládat s debounce, flush při schování appky ———
  const draftOwner = useRef(null);
  const pendingDraft = useRef(undefined);
  const draftTimer = useRef(null);
  const flushDraft = useCallback(() => {
    clearTimeout(draftTimer.current);
    const owner = draftOwner.current, v = pendingDraft.current;
    if (!owner || v === undefined) return;
    pendingDraft.current = undefined;
    try {
      if (v) localStorage.setItem(draftKey(owner), JSON.stringify(v));
      else localStorage.removeItem(draftKey(owner));
    } catch { /* plné úložiště – draft zůstane jen v paměti */ }
  }, []);
  useEffect(() => {
    flushDraft();
    draftOwner.current = user ? user.uid : null;
    setActive(user ? loadDraft(user.uid) : null);
    setRest(null);
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!draftOwner.current) return;
    pendingDraft.current = active;
    if (!active) flushDraft();
    else { clearTimeout(draftTimer.current); draftTimer.current = setTimeout(flushDraft, 300); }
  }, [active, flushDraft]);
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && flushDraft();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flushDraft);
    return () => { document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', flushDraft); };
  }, [flushDraft]);

  // ——— Hlavní šablony ———
  const prof = profileOf(profile);
  const main = useMemo(() => {
    const m = mainStore[prof.id];
    const groups = m ? m.groups : prof.groups.map((id) => ({ id, label: id, sub: '' }));
    const list = m ? m.templates.map((x) => ({ ...migrateTemplate(x), builtin: true })) : prof.templates;
    const label = (id) => groups.find((g) => g.id === id)?.label || id;
    return { groups, templates: list.map((x) => ({ ...x, name: `${label(x.group)} ${x.variant || ''}`.trim() })) };
  }, [mainStore, prof]);
  const templates = useMemo(() => [...main.templates, ...custom], [main, custom]);

  // ——— Undo (posledních 5 změn šablon, knihovny a historie) ———
  const snap = useRef({});
  snap.current = { custom, library, mainStore, workouts, prs };
  const remember = useCallback((label) => {
    const { custom: c, library: l, mainStore: m, workouts: w } = snap.current;
    setUndoStack((st) => [...st.slice(-4), { label, custom: c, library: l, mainStore: m, workouts: w }]);
  }, []);
  const stackRef = useRef(undoStack);
  stackRef.current = undoStack;
  const undo = useCallback(() => {
    const st = stackRef.current;
    const last = st[st.length - 1];
    if (!last || !api) return;
    setUndoStack(st.slice(0, -1));
    const now = snap.current;
    const before = new Map(last.custom.map((x) => [x.id, x]));
    for (const x of now.custom) if (!before.has(x.id)) api.deleteTemplate(x.id).catch(fail('err.delete'));
    for (const x of last.custom) if (JSON.stringify(x) !== JSON.stringify(now.custom.find((y) => y.id === x.id))) api.saveTemplate(x).catch(fail('err.save'));
    setCustom(last.custom);
    if (last.library !== now.library) { setLibrary(last.library); api.saveExercises(last.library).catch(fail('err.save')); }
    if (last.mainStore !== now.mainStore) {
      setMainStore(last.mainStore);
      for (const id of new Set([...Object.keys(last.mainStore), ...Object.keys(now.mainStore)])) {
        if (last.mainStore[id] !== now.mainStore[id]) api.saveMain(id, last.mainStore[id] || null).catch(fail('err.save'));
      }
    }
    if (last.workouts !== now.workouts) {
      // Vrátit smazané i upravené tréninky; tréninky dokončené mezitím zůstanou.
      const nowById = new Map(now.workouts.map((w) => [w.id, w]));
      const lastIds = new Set(last.workouts.map((w) => w.id));
      const merged = byStart([...last.workouts, ...now.workouts.filter((w) => !lastIds.has(w.id))]);
      const changed = last.workouts.filter((w) => JSON.stringify(nowById.get(w.id)) !== JSON.stringify(w));
      const keys = new Set();
      for (const w of changed) {
        w.exercises.forEach((e) => keys.add(e.key));
        nowById.get(w.id)?.exercises.forEach((e) => keys.add(e.key));
      }
      const changes = recomputeKeys(keys, merged, now.prs);
      changed.forEach((w, i) => api.saveWorkout(w, i === 0 ? changes : {}).catch(fail('err.save')));
      setPrs(applyChanges(now.prs, changes));
      setWorkouts(merged);
    }
    notify(t('undo.done', { what: t(last.label) }));
  }, [api, fail, notify]);

  const writeMain = useCallback((cfg) => {
    setMainStore((ms) => ({ ...ms, [prof.id]: cfg }));
    api.saveMain(prof.id, cfg).catch(fail('err.save'));
  }, [api, fail, prof.id]);
  const cleanMainTpl = (x) => { const { builtin, ...rest } = x; void builtin; return rest; };
  const saveMainTemplate = useCallback((tpl) => {
    remember('undo.tpl');
    const list = main.templates.some((x) => x.id === tpl.id) ? main.templates.map((x) => (x.id === tpl.id ? tpl : x)) : [...main.templates, tpl];
    writeMain({ groups: main.groups, templates: list.map(cleanMainTpl) });
  }, [main, writeMain, remember]);
  const deleteMainTemplate = useCallback((id) => {
    remember('undo.tplDel');
    writeMain({ groups: main.groups, templates: main.templates.filter((x) => x.id !== id).map(cleanMainTpl) });
  }, [main, writeMain, remember]);
  const renameGroup = useCallback((id, label, sub) => {
    remember('undo.group');
    writeMain({ groups: main.groups.map((g) => (g.id === id ? { ...g, label: sanitizeName(label, 20), sub: sanitizeName(sub) } : g)), templates: main.templates.map(cleanMainTpl) });
  }, [main, writeMain, remember]);
  const resetMain = useCallback(() => {
    remember('undo.reset');
    setMainStore((ms) => { const n = { ...ms }; delete n[prof.id]; return n; });
    api.saveMain(prof.id, null).catch(fail('err.save'));
  }, [api, fail, prof.id, remember]);
  const groupLabel = useCallback((id) => main.groups.find((g) => g.id === id)?.label || id, [main]);
  const groupSub = useCallback((id) => main.groups.find((x) => x.id === id)?.sub || t('groups.' + id), [main]);
  // Týdenní cíl: účet (meta/settings) + lokální kopie, kdyby zápis selhal (např. starší rules)
  const setWeeklyGoal = useCallback((n) => {
    const v = Math.min(7, Math.max(1, Math.round(n)));
    setWeeklyGoalState(v);
    try { localStorage.setItem(`forge:goal:${user?.uid}`, String(v)); } catch { /* ignore */ }
    api?.saveSettings({ weeklyGoal: v }).catch((e) => console.warn('settings', e));
  }, [api, user?.uid]);
  const setProfile = useCallback((id) => {
    setProfileState(id);
    api.saveProfile(id).catch(fail('err.save'));
  }, [api, fail]);

  // Rychlé vyhledávání v knihovně (místo find + exKey v každém volání)
  const libMap = useMemo(() => new Map(library.map((e) => [exKey(e.name), e])), [library]);
  const typeOf = useCallback((name) => libMap.get(exKey(name))?.type || defaultTypeOf(name), [libMap]);
  const catOf = useCallback((name) => libMap.get(exKey(name))?.cat || null, [libMap]);
  const infoOf = useCallback((name) => {
    const k = exKey(name);
    const e = libMap.get(k);
    if (e?.db) return { db: e.db };
    return INFO_KEYS.has(k) ? { curated: true } : null;
  }, [libMap]);

  // Poslední zapsané série cviku (historie je seřazená od nejnovější)
  const lastSets = useCallback((key) => {
    for (const w of workouts) {
      const e = w.exercises.find((x) => x.key === key);
      if (e && e.sets.length) return e.sets;
    }
    return null;
  }, [workouts]);

  // ——— Historie ———
  const deleteWorkout = useCallback((id) => {
    const w = workouts.find((x) => x.id === id);
    if (!w) return;
    remember('undo.workout');
    const remaining = workouts.filter((x) => x.id !== id);
    const changes = changesAfterDelete(w, remaining, prs);
    setWorkouts(remaining);
    setPrs((p) => applyChanges(p, changes));
    api.deleteWorkout(id, changes).catch(fail('err.delete'));
  }, [workouts, prs, api, fail, remember]);

  // Úprava tréninku z historie (název, datum, délka, série). Rekordy dotčených cviků se přepočítají.
  const updateWorkout = useCallback((edited) => {
    const old = workouts.find((x) => x.id === edited.id);
    if (!old) return false;
    const exercises = edited.exercises
      .map((e) => {
        const timed = e.type === 'time';
        const sets = e.sets.map((s) => sanitizeSet(s, timed)).filter((s) => (timed ? s.time > 0 : s.reps > 0));
        return { key: e.key, name: sanitizeName(e.name), ...(timed ? { type: 'time' } : {}), sets };
      })
      .filter((e) => e.sets.length)
      .slice(0, LIMITS.exercises);
    if (!exercises.length) return false;
    const startedAt = Math.round(edited.startedAt);
    const w = {
      ...old,
      name: sanitizeName(edited.name) || old.name,
      startedAt,
      finishedAt: Math.max(startedAt, Math.round(edited.finishedAt)),
      exercises,
    };
    remember('undo.workoutEdit');
    const list = byStart(workouts.map((x) => (x.id === w.id ? w : x)));
    const keys = new Set([...old.exercises, ...w.exercises].map((e) => e.key));
    const changes = recomputeKeys(keys, list, prs);
    setWorkouts(list);
    setPrs((p) => applyChanges(p, changes));
    api.saveWorkout(w, changes).catch(fail('err.save'));
    return true;
  }, [workouts, prs, api, fail, remember]);

  const saveTemplate = useCallback((tpl) => {
    remember('undo.tpl');
    setCustom((c) => [...c.filter((x) => x.id !== tpl.id), tpl]);
    api.saveTemplate(tpl).catch(fail('err.save'));
  }, [api, fail, remember]);
  const deleteTemplate = useCallback((id) => {
    remember('undo.tplDel');
    setCustom((c) => c.filter((x) => x.id !== id));
    api.deleteTemplate(id).catch(fail('err.delete'));
  }, [api, fail, remember]);

  // ——— Knihovna ———
  const saveLibrary = useCallback((list) => {
    remember('undo.library');
    const next = list.map(toLibEntry).filter((e) => e.name).slice(0, LIMITS.library);
    setLibrary(next);
    api.saveExercises(next).catch(fail('err.save'));
  }, [api, fail, remember]);
  const addToLibrary = useCallback((ex) => {
    const entry = toLibEntry(ex);
    if (!entry.name) return;
    remember('undo.library');
    setLibrary((lib) => {
      const next = [...lib.filter((x) => exKey(x.name) !== exKey(entry.name)), entry].slice(0, LIMITS.library);
      api.saveExercises(next).catch(fail('err.save'));
      return next;
    });
  }, [api, fail, remember]);
  const resetLibrary = useCallback(() => saveLibrary(EXERCISES), [saveLibrary]);

  // ——— Aktivní trénink ———
  const startWorkout = useCallback((tpl) => {
    const exercises = tpl.exercises.map((e) => {
      const key = exKey(e.name);
      const last = lastSets(key);
      // Předvyplnění: 1) poslední trénink 2) plán série 3) výchozí váha/opakování šablony
      const sets = Array.from({ length: e.sets }, (_, i) => {
        const src = last ? last[Math.min(i, last.length - 1)] : null;
        if (src) return newSet(src);
        const p = e.plan?.[i];
        return newSet({ weight: p?.w || e.weight || '', reps: p ? (typeof p.r === 'number' ? p.r : '') : firstNum(e.reps), time: p?.t || e.time || '' });
      });
      const type = e.type || typeOf(e.name);
      return { id: uid(), key, name: e.name, type, plan: type === 'time' ? t('count.sets', { n: e.sets }) : planLabel(e), hint: last ? '' : e.hint || '', note: e.note || '', sets };
    });
    setRest(null);
    setActive({ id: uid(), templateId: tpl.id, name: tpl.name, group: tpl.group || '', variant: tpl.variant || '', startedAt: Date.now(), exercises });
  }, [lastSets, typeOf]);

  const startEmptyWorkout = useCallback(() => {
    setRest(null);
    setActive({ id: uid(), templateId: '', name: t('wo.emptyName'), group: '', variant: '', startedAt: Date.now(), exercises: [] });
  }, []);
  const discardWorkout = useCallback(() => { setActive(null); setRest(null); }, []);

  const finishWorkout = useCallback(({ includeUnchecked = false } = {}) => {
    if (!active) return { empty: true };
    const draft = active, prevPrs = prs;
    const finishedAt = Date.now();
    const exercises = active.exercises
      .map((e) => {
        const timed = e.type === 'time';
        const sets = e.sets
          .filter((s) => isDone(s) || (includeUnchecked && hasValue(s, timed)))
          .map((s) => sanitizeSet(s, timed))
          .filter((s) => (timed ? s.time > 0 : s.reps > 0));
        return { key: e.key, name: sanitizeName(e.name), ...(timed ? { type: 'time' } : {}), sets };
      })
      .filter((e) => e.sets.length)
      .slice(0, LIMITS.exercises);
    if (!exercises.length) return { empty: true };

    const done = {
      id: active.id, templateId: String(active.templateId || '').slice(0, 60), name: sanitizeName(active.name) || t('wo.emptyName'),
      group: sanitizeName(active.group, 20), variant: sanitizeName(active.variant, LIMITS.variant),
      startedAt: active.startedAt, finishedAt: Math.max(finishedAt, active.startedAt), exercises,
    };
    const { next, updates, beaten } = applyWorkout(done, prs);
    setWorkouts((w) => [done, ...w.filter((x) => x.id !== done.id)]);
    setPrs(next);
    setActive(null);
    setRest(null);
    // Offline se zápis zařadí do fronty a odešle později. Selže jen při odmítnutí serverem → vrátit draft.
    api.saveWorkout(done, updates).catch((e) => {
      console.error(e);
      setActive((cur) => cur || draft);
      setPrs(prevPrs);
      setWorkouts((w) => w.filter((x) => x.id !== done.id));
      notify(t('err.saveWorkout', { m: e?.code || e?.message || '?' }), { duration: 8000 });
    });
    return { empty: false, beaten };
  }, [active, prs, api, notify]);

  const patchActive = useCallback((fn) => setActive((a) => (a ? fn(a) : a)), []);
  const addExerciseToActive = useCallback((ex) => {
    const key = exKey(ex.name);
    const last = lastSets(key);
    const type = ex.type || typeOf(ex.name);
    const sets = (last || [{}]).map(newSet);
    while (sets.length < (type === 'time' ? 1 : 3)) sets.push(newSet(sets[sets.length - 1]));
    patchActive((a) => ({ ...a, exercises: [...a.exercises, { id: uid(), key, name: ex.name, type, plan: '', hint: '', note: '', sets }] }));
  }, [lastSets, patchActive, typeOf]);

  // ——— Pauza ———
  const startRest = useCallback(() => {
    const total = getRestDefault();
    if (total > 0) setRest({ until: Date.now() + total * 1000, total });
  }, []);
  const adjustRest = useCallback((delta) => setRest((r) => (r ? { ...r, until: Math.max(Date.now() + 5000, r.until + delta * 1000), total: Math.max(5, r.total + delta) } : r)), []);
  const stopRest = useCallback(() => setRest(null), []);

  const signIn = useCallback(() => { setDenied(null); return backend.signIn().catch(fail('err.login')); }, [fail]);
  const signOut = useCallback(async () => {
    flushDraft();
    draftOwner.current = null; // draft zůstane uložený pro svého majitele
    await backend.signOut();
    setActive(null); setRest(null);
    setCustom([]); setWorkouts([]); setPrs({}); setLibrary(EXERCISES); setProfileState(null); setMainStore({}); setUndoStack([]);
  }, [flushDraft]);

  const live = Boolean(active);
  const loading = metaLoading || (Boolean(user) && !workoutsReady);
  const data = useMemo(() => ({
    user, denied, loading, mode: backend.mode, signIn, signOut, live, sync, online,
    templates, workouts, prs, deleteWorkout, updateWorkout, saveTemplate, deleteTemplate, startWorkout, startEmptyWorkout,
    library, saveLibrary, addToLibrary, resetLibrary, catOf, typeOf, infoOf,
    profile, prof, setProfile, weeklyGoal, setWeeklyGoal, main, groupLabel, groupSub, saveMainTemplate, deleteMainTemplate, renameGroup, resetMain,
    undoStack, undo, notify,
  }), [user, denied, loading, signIn, signOut, live, sync, online, templates, workouts, prs, deleteWorkout, updateWorkout, saveTemplate, deleteTemplate, startWorkout, startEmptyWorkout,
    library, saveLibrary, addToLibrary, resetLibrary, catOf, typeOf, infoOf, profile, prof, setProfile, weeklyGoal, setWeeklyGoal, main, groupLabel, groupSub, saveMainTemplate, deleteMainTemplate, renameGroup, resetMain, undoStack, undo, notify]);

  const session = useMemo(() => ({
    active, patchActive, finishWorkout, discardWorkout, addExerciseToActive, prs, notify, rest, startRest, adjustRest, stopRest,
  }), [active, patchActive, finishWorkout, discardWorkout, addExerciseToActive, prs, notify, rest, startRest, adjustRest, stopRest]);

  const toastValue = useMemo(() => ({ toast, notify, dismissToast }), [toast, notify, dismissToast]);

  return (
    <DataCtx.Provider value={data}>
      <SessionCtx.Provider value={session}>
        <ToastCtx.Provider value={toastValue}>{children}</ToastCtx.Provider>
      </SessionCtx.Provider>
    </DataCtx.Provider>
  );
}
