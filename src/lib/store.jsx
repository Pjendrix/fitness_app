import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { backend, HISTORY_LIMIT } from './backend.js';
import { starterConfig, starterId } from '../data/defaultTemplates.js';
import { defaultTypeOf, EXERCISES, modernName, normCat } from '../data/exercises.js';
import { better, exKey, firstNum, hasValue, isDone, LIMITS, planLabel, sanitizeName, sanitizeSet, uid } from './util.js';
import { applyChanges, applyWorkout, changesAfterDelete, recomputeKeys } from './records.js';
import { getRestDefault } from './rest.js';
import { templateFromActive } from './templateSync.js';
import { markGuide } from './guide.js';
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
const MAX_PINS = 5;
const LEGACY_PINK = { tint: '#e27aa3', strength: 70, accent: null };
const byStart = (list) => [...list].sort((a, b) => b.startedAt - a.startedAt);
const prevOf = (s) => ({ weight: Number(s.weight) || 0, reps: Number(s.reps) || 0, time: Number(s.time) || 0 });
const newSet = (s = {}) => ({ id: uid(), weight: String(s.weight || ''), reps: String(s.reps || ''), time: String(s.time || ''), done: false });

const toLibEntry = (ex) => {
  const cat = normCat(ex.cat);
  return { name: sanitizeName(ex.name), cat, ...(ex.type === 'time' || (!ex.type && cat === 'cardio') ? { type: 'time' } : {}), ...(ex.db ? { db: String(ex.db).slice(0, 120) } : {}) };
};

export function StoreProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = načítání, null = odhlášen
  const [denied, setDenied] = useState(null); // e-mail účtu bez přístupu
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaReady, setMetaReady] = useState(false); // meta načtená pro aktuální účet
  const [workoutsReady, setWorkoutsReady] = useState(false);
  const [custom, setCustom] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [prs, setPrs] = useState({});
  const [library, setLibrary] = useState(EXERCISES);
  const [starter, setStarter] = useState(null);      // startovní split účtu (ppl / ul / fb)
  const [mainCfg, setMainCfg] = useState(null);      // hlavní šablony účtu; null = nový účet → výběr splitu
  const [appearance, setAppearanceState] = useState(null); // {tint, strength, accent}
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [active, setActive] = useState(null);
  const [toast, setToast] = useState(null);
  const [sync, setSync] = useState({ pending: false, fromCache: false });
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [rest, setRest] = useState(null); // {until, total}
  const [weeklyGoal, setWeeklyGoalState] = useState(3);
  const [pinnedLifts, setPinnedLifts] = useState([]);

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
    setMetaReady(false);
    setWorkoutsReady(false);
    api.loadAll()
      .then((d) => {
        if (cancelled) return;
        setCustom(d.templates.map(migrateTemplate));
        setPrs(migratePrs(d.prs));
        setLibrary(loadLibrary(d.library));
        // Migrace z pevných profilů (krystof/chiara) na vlastní konfiguraci účtu – nic se nemaže
        const sid = starterId(d.profile);
        let cfg = d.main?.own || null;
        if (!cfg && sid) {
          cfg = (d.profile && d.main?.[d.profile]) || starterConfig(sid);
          api.saveMain(cfg).catch((e) => console.warn('migrate main', e));
          if (sid !== d.profile) api.saveProfile(sid).catch((e) => console.warn('migrate profile', e));
        }
        setStarter(sid);
        setMainCfg(cfg);
        let look = d.settings?.appearance || null;
        if (!look && d.profile === 'chiara') {
          look = LEGACY_PINK; // Chiara si nechá růžové podbarvení
          api.saveSettings({ appearance: look }).catch((e) => console.warn('migrate appearance', e));
        }
        setAppearanceState(look);
        setMetaReady(true);
        const cached = parseInt(localStorage.getItem(`forge:goal:${user.uid}`), 10);
        setWeeklyGoalState(d.settings?.weeklyGoal || cached || 3);
        let pins = d.settings?.pinnedLifts;
        if (!Array.isArray(pins)) { try { pins = JSON.parse(localStorage.getItem(`forge:pins:${user.uid}`)); } catch { pins = null; } }
        setPinnedLifts(Array.isArray(pins) ? pins.filter((k) => typeof k === 'string').slice(0, MAX_PINS) : []);
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

  // ——— Hlavní šablony (vlastní konfigurace účtu) ———
  const main = useMemo(() => {
    const groups = mainCfg?.groups || [];
    const list = (mainCfg?.templates || []).map((x) => ({ ...migrateTemplate(x), builtin: true }));
    const label = (id) => groups.find((g) => g.id === id)?.label || id;
    return { groups, templates: list.map((x) => ({ ...x, name: `${label(x.group)} ${x.variant || ''}`.trim() })) };
  }, [mainCfg]);
  const needsSetup = Boolean(user) && metaReady && !mainCfg;
  const templates = useMemo(() => [...main.templates, ...custom], [main, custom]);

  // ——— Undo / Redo (posledních 5 změn šablon, knihovny a historie) ———
  // Položka = snímek stavu; `drop` = id tréninků, které obnova přidala (a zrušení obnovy je má zase smazat).
  const snap = useRef({});
  snap.current = { custom, library, mainCfg, workouts, prs };
  const remember = useCallback((label) => {
    const { custom: c, library: l, mainCfg: m, workouts: w } = snap.current;
    setUndoStack((st) => [...st.slice(-4), { label, custom: c, library: l, mainCfg: m, workouts: w, drop: [] }]);
    setRedoStack([]); // nová změna zahodí historii „Znovu“
  }, []);
  const stackRef = useRef({ undo: undoStack, redo: redoStack });
  stackRef.current = { undo: undoStack, redo: redoStack };

  // Vrátí stav na snímek `target`; vrací protipoložku (aktuální stav) pro opačný zásobník.
  const restore = useCallback((target) => {
    const now = snap.current;
    const counter = { label: target.label, custom: now.custom, library: now.library, mainCfg: now.mainCfg, workouts: now.workouts, drop: [] };
    const before = new Map(target.custom.map((x) => [x.id, x]));
    for (const x of now.custom) if (!before.has(x.id)) api.deleteTemplate(x.id).catch(fail('err.delete'));
    for (const x of target.custom) if (JSON.stringify(x) !== JSON.stringify(now.custom.find((y) => y.id === x.id))) api.saveTemplate(x).catch(fail('err.save'));
    setCustom(target.custom);
    if (target.library !== now.library) { setLibrary(target.library); api.saveExercises(target.library).catch(fail('err.save')); }
    if (target.mainCfg !== now.mainCfg) {
      setMainCfg(target.mainCfg);
      if (target.mainCfg) api.saveMain(target.mainCfg).catch(fail('err.save'));
    }
    if (target.workouts !== now.workouts) {
      // Obnovit smazané/upravené tréninky; tréninky dokončené mezitím zůstanou.
      const nowById = new Map(now.workouts.map((w) => [w.id, w]));
      const targetIds = new Set(target.workouts.map((w) => w.id));
      const drop = new Set(target.drop || []);
      const removed = now.workouts.filter((w) => !targetIds.has(w.id) && drop.has(w.id));
      const merged = byStart([...target.workouts, ...now.workouts.filter((w) => !targetIds.has(w.id) && !drop.has(w.id))]);
      const changed = target.workouts.filter((w) => JSON.stringify(nowById.get(w.id)) !== JSON.stringify(w));
      counter.drop = target.workouts.filter((w) => !nowById.has(w.id)).map((w) => w.id);
      const keys = new Set();
      for (const w of [...changed, ...removed]) {
        w.exercises.forEach((e) => keys.add(e.key));
        nowById.get(w.id)?.exercises.forEach((e) => keys.add(e.key));
      }
      const changes = recomputeKeys(keys, merged, now.prs);
      let first = true;
      const take = () => { if (!first) return {}; first = false; return changes; }; // změny PB jen s prvním zápisem
      changed.forEach((w) => api.saveWorkout(w, take()).catch(fail('err.save')));
      removed.forEach((w) => api.deleteWorkout(w.id, take()).catch(fail('err.delete')));
      setPrs(applyChanges(now.prs, changes));
      setWorkouts(merged);
    }
    return counter;
  }, [api, fail]);

  const actions = useRef({});
  const undo = useCallback(() => {
    const { undo: st, redo: rs } = stackRef.current;
    const last = st[st.length - 1];
    if (!last || !api) return;
    const counter = restore(last);
    setUndoStack(st.slice(0, -1));
    setRedoStack([...rs.slice(-4), counter]);
    notify(t('undo.done', { what: t(last.label) }), { action: { label: t('undo.redoBtn'), run: () => actions.current.redo() } });
  }, [api, restore, notify]);
  const redo = useCallback(() => {
    const { undo: st, redo: rs } = stackRef.current;
    const last = rs[rs.length - 1];
    if (!last || !api) return;
    const counter = restore(last);
    setRedoStack(rs.slice(0, -1));
    setUndoStack([...st.slice(-4), counter]);
    notify(t('undo.redone', { what: t(last.label) }), { action: { label: t('undo.btn'), run: () => actions.current.undo() } });
  }, [api, restore, notify]);
  actions.current = { undo, redo };

  const writeMain = useCallback((cfg) => {
    setMainCfg(cfg);
    api.saveMain(cfg).catch(fail('err.save'));
  }, [api, fail]);
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
  // Hlavní šablony ze startovního splitu (první výběr nového účtu i „obnovit šablony“)
  const chooseStarter = useCallback((id) => {
    const sid = starterId(id) || 'ppl';
    if (mainCfg) remember('undo.reset');
    writeMain(starterConfig(sid));
    setStarter(sid);
    api.saveProfile(sid).catch(fail('err.save'));
  }, [api, fail, mainCfg, remember, writeMain]);
  // Vzhled účtu: podbarvení (tint + intenzita) a akcentní barva tlačítek
  const setAppearance = useCallback((patch) => {
    setAppearanceState((cur) => {
      const next = { tint: null, strength: 50, accent: null, ...(cur || {}), ...patch };
      api?.saveSettings({ appearance: next }).catch((e) => console.warn('settings', e));
      return next;
    });
  }, [api]);
  const groupLabel = useCallback((id) => main.groups.find((g) => g.id === id)?.label || id, [main]);
  const groupSub = useCallback((id) => main.groups.find((x) => x.id === id)?.sub || t('groups.' + id), [main]);
  // Týdenní cíl: účet (meta/settings) + lokální kopie, kdyby zápis selhal (např. starší rules)
  const setWeeklyGoal = useCallback((n) => {
    const v = Math.min(7, Math.max(1, Math.round(n)));
    setWeeklyGoalState(v);
    try { localStorage.setItem(`forge:goal:${user?.uid}`, String(v)); } catch { /* ignore */ }
    api?.saveSettings({ weeklyGoal: v }).catch((e) => console.warn('settings', e));
  }, [api, user?.uid]);
  // Připnuté „Key lifts“ v mobilních statistikách (max 5); účet + lokální kopie jako u týdenního cíle
  const togglePin = useCallback((key) => {
    const has = pinnedLifts.includes(key);
    if (!has && pinnedLifts.length >= MAX_PINS) { notify(t('ms.pinMax', { n: MAX_PINS })); return false; }
    const next = has ? pinnedLifts.filter((k) => k !== key) : [...pinnedLifts, key];
    setPinnedLifts(next);
    try { localStorage.setItem(`forge:pins:${user?.uid}`, JSON.stringify(next)); } catch { /* ignore */ }
    api?.saveSettings({ pinnedLifts: next }).catch((e) => console.warn('settings', e));
    return true;
  }, [pinnedLifts, api, user?.uid, notify]);

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
      // prev = minulé série (řádek „minule“), spec/specs = rozsah opakování pro cíl progrese, ss = superset skupina
      return {
        id: uid(), key, name: e.name, type, plan: type === 'time' ? t('count.sets', { n: e.sets }) : planLabel(e), hint: last ? '' : e.hint || '', note: e.note || '', sets,
        prev: last ? last.map(prevOf) : null, spec: e.reps ?? '', specs: e.plan ? e.plan.map((p) => p.r) : null, ss: e.ss || '',
      };
    });
    setRest(null);
    markGuide('start');
    setActive({ id: uid(), templateId: tpl.id, name: tpl.name, group: tpl.group || '', variant: tpl.variant || '', startedAt: Date.now(), exercises });
  }, [lastSets, typeOf]);

  const startEmptyWorkout = useCallback(() => {
    setRest(null);
    markGuide('start');
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
          .filter((s) => !s.warm) // rozcvičkové série se neukládají (nepočítají se do objemu ani rekordů)
          .filter((s) => isDone(s) || (includeUnchecked && hasValue(s, timed)))
          .map((s) => sanitizeSet(s, timed))
          .filter((s) => (timed ? s.time > 0 : s.reps > 0));
        const rpe = Number(e.rpe);
        return {
          key: e.key, name: sanitizeName(e.name), ...(timed ? { type: 'time' } : {}), sets,
          ...(e.memo ? { note: sanitizeName(e.memo, 200) } : {}), ...(rpe >= 1 && rpe <= 10 ? { rpe } : {}), ...(e.ss ? { ss: String(e.ss).slice(0, 8) } : {}),
        };
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
    return { empty: false, beaten, done };
  }, [active, prs, api, notify]);

  const patchActive = useCallback((fn) => setActive((a) => (a ? fn(a) : a)), []);
  const addExerciseToActive = useCallback((ex) => {
    const key = exKey(ex.name);
    const last = lastSets(key);
    const type = ex.type || typeOf(ex.name);
    const sets = (last || [{}]).map(newSet);
    while (sets.length < (type === 'time' ? 1 : 3)) sets.push(newSet(sets[sets.length - 1]));
    patchActive((a) => ({ ...a, exercises: [...a.exercises, { id: uid(), key, name: ex.name, type, plan: '', hint: '', note: '', sets, prev: last ? last.map(prevOf) : null, ss: '' }] }));
  }, [lastSets, patchActive, typeOf]);

  // Nahrazení cviku v aktivním tréninku (obsazené stanoviště).
  // Bez odškrtnutých sérií → výměna na místě. S odškrtnutými → hotové série zůstanou u původního cviku,
  // náhrada se vloží hned pod něj se zbývajícím počtem sérií.
  const replaceExerciseInActive = useCallback((exId, ex) => {
    const old = active?.exercises.find((e) => e.id === exId);
    if (!old) return;
    const key = exKey(ex.name);
    if (key === old.key) return;
    const type = ex.type || typeOf(ex.name);
    const last = lastSets(key);
    const done = old.sets.filter(isDone);
    const count = Math.max(1, old.sets.length - done.length);
    const sets = Array.from({ length: count }, (_, i) => newSet(last ? last[Math.min(i, last.length - 1)] : {}));
    const plan = type === (old.type || 'reps') ? old.plan : type === 'time' ? t('count.sets', { n: count }) : '';
    const fresh = { id: uid(), key, name: ex.name, type, plan, hint: '', note: '', sets, prev: last ? last.map(prevOf) : null, spec: type === (old.type || 'reps') ? old.spec : undefined, ss: old.ss || '' };
    const split = done.length > 0;
    patchActive((a) => {
      const i = a.exercises.findIndex((e) => e.id === exId);
      if (i < 0) return a;
      const list = [...a.exercises];
      if (split) list.splice(i, 1, { ...a.exercises[i], sets: a.exercises[i].sets.filter(isDone) }, fresh);
      else list.splice(i, 1, fresh);
      return { ...a, exercises: list };
    });
    notify(t(split ? 'rep.doneSplit' : 'rep.done', { from: old.name, to: ex.name }), {
      duration: 6000,
      action: {
        label: t('undo.btn'),
        run: () => patchActive((a) => {
          const list = a.exercises.filter((e) => e.id !== fresh.id);
          const at = list.findIndex((e) => e.id === old.id);
          if (at >= 0) list[at] = old; else list.push(old);
          return { ...a, exercises: list };
        }),
      },
    });
  }, [active, lastSets, typeOf, patchActive, notify]);

  // ——— Pauza ———
  const startRest = useCallback(() => {
    const total = getRestDefault();
    if (total > 0) setRest({ until: Date.now() + total * 1000, total });
  }, []);
  const adjustRest = useCallback((delta) => setRest((r) => (r ? { ...r, until: Math.max(Date.now() + 5000, r.until + delta * 1000), total: Math.max(5, r.total + delta) } : r)), []);
  const stopRest = useCallback(() => setRest(null), []);

  // W4: uložit změny z tréninku do jeho šablony (hlavní i vlastní)
  const syncTemplate = useCallback((tplId, snapshot) => {
    const tpl = templates.find((x) => x.id === tplId);
    if (!tpl || !snapshot) return false;
    const next = templateFromActive(tpl, snapshot);
    if (tpl.builtin) { const { builtin, name, ...rest } = next; void builtin; void name; saveMainTemplate(rest); }
    else saveTemplate(next);
    return true;
  }, [templates, saveMainTemplate, saveTemplate]);

  // S3: import zálohy (JSON z exportu). Slučuje: existující tréninky/šablony se stejným id se přeskočí / přepíšou.
  const importData = useCallback(async (raw) => {
    const d = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!d || !Array.isArray(d.workouts)) throw new Error('format');
    const have = new Set(workouts.map((w) => w.id));
    const fresh = d.workouts
      .filter((w) => w && typeof w.id === 'string' && !have.has(w.id) && Array.isArray(w.exercises) && Number.isFinite(w.startedAt))
      .map((w) => {
        const exercises = w.exercises.map((e) => {
          const timed = e.type === 'time';
          const sets = (e.sets || []).map((x) => sanitizeSet(x, timed)).filter((x) => (timed ? x.time > 0 : x.reps > 0));
          const name = sanitizeName(modernName(e.name || ''));
          return { key: exKey(name), name, ...(timed ? { type: 'time' } : {}), sets, ...(e.note ? { note: sanitizeName(e.note, 200) } : {}), ...(e.rpe ? { rpe: Number(e.rpe) } : {}), ...(e.ss ? { ss: String(e.ss).slice(0, 8) } : {}) };
        }).filter((e) => e.name && e.sets.length).slice(0, LIMITS.exercises);
        const startedAt = Math.round(w.startedAt);
        return {
          id: String(w.id).slice(0, 60), templateId: String(w.templateId || '').slice(0, 60), name: sanitizeName(w.name) || t('wo.emptyName'),
          group: sanitizeName(w.group, 20), variant: sanitizeName(w.variant, LIMITS.variant), startedAt,
          finishedAt: Math.max(startedAt, Math.round(w.finishedAt || startedAt)), exercises,
        };
      })
      .filter((w) => w.exercises.length)
      .slice(0, Math.max(0, HISTORY_LIMIT - workouts.length));
    const tpls = Array.isArray(d.templates) ? d.templates.filter((x) => x && typeof x.id === 'string' && Array.isArray(x.exercises) && !x.builtin) : [];
    const lib = Array.isArray(d.library) ? d.library.filter((e) => e && e.name) : [];
    const merged = byStart([...workouts, ...fresh]);
    const keys = new Set(fresh.flatMap((w) => w.exercises.map((e) => e.key)));
    const changes = recomputeKeys(keys, merged, prs);
    await Promise.all(fresh.map((w) => api.saveWorkout(w, {})));
    if (Object.keys(changes).length) await api.applyPrChanges(changes);
    setWorkouts(merged);
    setPrs((p) => applyChanges(p, changes));
    for (const x of tpls) { const tpl = { ...x, name: sanitizeName(x.name) || t('tpl.name'), exercises: x.exercises.slice(0, LIMITS.exercises) }; setCustom((c) => [...c.filter((y) => y.id !== tpl.id), tpl]); api.saveTemplate(tpl).catch(fail('err.save')); }
    let added = 0;
    if (lib.length) {
      const known = new Set(library.map((e) => exKey(e.name)));
      const extra = lib.map(toLibEntry).filter((e) => e.name && !known.has(exKey(e.name)));
      added = extra.length;
      if (added) { const next = [...library, ...extra].slice(0, LIMITS.library); setLibrary(next); api.saveExercises(next).catch(fail('err.save')); }
    }
    return { workouts: fresh.length, templates: tpls.length, exercises: added };
  }, [workouts, prs, library, api, fail]);

  const signIn = useCallback(() => { setDenied(null); return backend.signIn().catch(fail('err.login')); }, [fail]);
  const signOut = useCallback(async () => {
    flushDraft();
    draftOwner.current = null; // draft zůstane uložený pro svého majitele
    await backend.signOut();
    setActive(null); setRest(null);
    setCustom([]); setWorkouts([]); setPrs({}); setLibrary(EXERCISES); setStarter(null); setMainCfg(null); setAppearanceState(null); setUndoStack([]); setRedoStack([]); setPinnedLifts([]);
  }, [flushDraft]);

  const startDemo = useCallback(() => backend.startDemo(), []);
  const resetDemo = useCallback(() => { backend.resetDemo(); window.location.reload(); }, []);
  const live = Boolean(active);
  const loading = metaLoading || (Boolean(user) && !workoutsReady);
  const data = useMemo(() => ({
    user, denied, loading, mode: backend.mode, signIn, signOut, startDemo, resetDemo, live, sync, online,
    templates, workouts, prs, deleteWorkout, updateWorkout, saveTemplate, deleteTemplate, startWorkout, startEmptyWorkout,
    library, saveLibrary, addToLibrary, resetLibrary, catOf, typeOf, infoOf,
    starter, chooseStarter, needsSetup, appearance, setAppearance, weeklyGoal, setWeeklyGoal, pinnedLifts, togglePin, main, groupLabel, groupSub, saveMainTemplate, deleteMainTemplate, renameGroup,
    undoStack, undo, redoStack, redo, notify, syncTemplate, importData,
  }), [user, denied, loading, signIn, signOut, startDemo, resetDemo, live, sync, online, templates, workouts, prs, deleteWorkout, updateWorkout, saveTemplate, deleteTemplate, startWorkout, startEmptyWorkout,
    library, saveLibrary, addToLibrary, resetLibrary, catOf, typeOf, infoOf, starter, chooseStarter, needsSetup, appearance, setAppearance, weeklyGoal, setWeeklyGoal, pinnedLifts, togglePin, main, groupLabel, groupSub, saveMainTemplate, deleteMainTemplate, renameGroup, undoStack, undo, redoStack, redo, notify, syncTemplate, importData]);

  const session = useMemo(() => ({
    active, patchActive, finishWorkout, discardWorkout, addExerciseToActive, replaceExerciseInActive, prs, notify, rest, startRest, adjustRest, stopRest,
  }), [active, patchActive, finishWorkout, discardWorkout, addExerciseToActive, replaceExerciseInActive, prs, notify, rest, startRest, adjustRest, stopRest]);

  const toastValue = useMemo(() => ({ toast, notify, dismissToast }), [toast, notify, dismissToast]);

  return (
    <DataCtx.Provider value={data}>
      <SessionCtx.Provider value={session}>
        <ToastCtx.Provider value={toastValue}>{children}</ToastCtx.Provider>
      </SessionCtx.Provider>
    </DataCtx.Provider>
  );
}
