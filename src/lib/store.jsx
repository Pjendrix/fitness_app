import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { backend } from './backend.js';
import { profileOf } from '../data/defaultTemplates.js';
import { defaultTypeOf, EXERCISES, modernName, normCat } from '../data/exercises.js';
import { better, exKey, firstNum, isDone, num, planLabel, uid } from './util.js';
import { t } from './i18n.js';
import { INFO_KEYS } from '../data/infoKeys.js';

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

const DRAFT = 'forge:active';
const loadDraft = () => {
  try {
    return JSON.parse(localStorage.getItem(DRAFT));
  } catch {
    return null;
  }
};

// Old Czech exercise names → English (history, PBs, templates keep linking).
const migrateEx = (e) => {
  const name = modernName(e.name);
  return name === e.name ? e : { ...e, name, key: exKey(name) };
};
const migrateWorkout = (w) => ({ ...w, exercises: w.exercises.map(migrateEx) });
const migratePrs = (prs) => {
  const out = {};
  for (const p of Object.values(prs)) {
    const name = modernName(p.name);
    const key = exKey(name);
    if (better(p, out[key]) || !out[key]) out[key] = { ...p, name };
  }
  return out;
};
const migrateTemplate = (tpl) => ({ ...tpl, exercises: tpl.exercises.map((e) => ({ ...e, name: modernName(e.name) })) });
const loadLibrary = (doc) => {
  if (!doc) return EXERCISES;
  const list = (doc.list || []).map((e) => ({ name: modernName(e.name), cat: normCat(e.cat), ...(e.type === 'time' ? { type: 'time' } : {}), ...(e.db ? { db: e.db } : {}) }));
  if (doc.v === 2) return list;
  // legacy: list = custom additions on top of defaults
  const have = new Set(EXERCISES.map((e) => exKey(e.name)));
  return [...EXERCISES, ...list.filter((e) => !have.has(exKey(e.name)))];
};

export function StoreProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = signed out
  const [loading, setLoading] = useState(false);
  const [custom, setCustom] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [prs, setPrs] = useState({});
  const [library, setLibrary] = useState(EXERCISES);
  const [profile, setProfileState] = useState(null);
  const [mainStore, setMainStore] = useState({}); // { [profileId]: {groups, templates} } – user-edited main templates
  const [undoStack, setUndoStack] = useState([]);
  const [active, setActive] = useState(loadDraft);
  const [toast, setToast] = useState(null);

  const api = useMemo(() => (user ? backend.data(user.uid) : null), [user]);

  const notify = useCallback((msg) => {
    setToast({ msg, id: Date.now() });
    setTimeout(() => setToast((x) => (x && Date.now() - x.id >= 2800 ? null : x)), 3000);
  }, []);
  const fail = useCallback((key) => (e) => notify(t(key, { m: e.message })), [notify]);

  useEffect(() => {
    let unsub = () => {};
    backend.onAuth(setUser).then((u) => (unsub = u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    setLoading(true);
    api
      .loadAll()
      .then((d) => {
        if (cancelled) return;
        setCustom(d.templates.map(migrateTemplate));
        setWorkouts(d.workouts.map(migrateWorkout));
        setPrs(migratePrs(d.prs));
        setLibrary(loadLibrary(d.library));
        setProfileState(d.profile || null);
        setMainStore(d.main || {});
      })
      .catch(fail('err.load'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [api, fail]);

  useEffect(() => {
    if (active) localStorage.setItem(DRAFT, JSON.stringify(active));
    else localStorage.removeItem(DRAFT);
  }, [active]);

  const prof = profileOf(profile);
  // Main templates: user-edited version for this profile, or defaults
  const main = useMemo(() => {
    const m = mainStore[prof.id];
    const groups = m ? m.groups : prof.groups.map((id) => ({ id, label: id, sub: '' }));
    const list = m ? m.templates.map((x) => ({ ...migrateTemplate(x), builtin: true })) : prof.templates;
    // Main template name is always "<group> <variant>" – group name is fixed, only the variant is named
    const label = (id) => groups.find((g) => g.id === id)?.label || id;
    return { groups, templates: list.map((x) => ({ ...x, name: `${label(x.group)} ${x.variant || ''}`.trim() })) };
  }, [mainStore, prof]);
  const templates = useMemo(() => [...main.templates, ...custom], [main, custom]);

  // ——— Undo (last 5 changes to templates, main templates, library, history) ———
  const snap = useRef({});
  snap.current = { custom, library, mainStore, workouts };
  const remember = useCallback((label) => {
    const { custom: c, library: l, mainStore: m, workouts: w } = snap.current;
    setUndoStack((st) => [...st.slice(-4), { label, custom: c, library: l, mainStore: m, workouts: w }]);
  }, []);
  const stackRef = useRef(undoStack);
  stackRef.current = undoStack;
  const undo = useCallback(() => {
    {
      const st = stackRef.current;
      const last = st[st.length - 1];
      if (!last) return;
      setUndoStack(st.slice(0, -1));
      const now = snap.current;
      // templates: delete added, re-save changed/removed
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
        const ids = new Set(now.workouts.map((w) => w.id));
        for (const w of last.workouts) if (!ids.has(w.id)) api.saveWorkout(w, {}).catch(fail('err.save'));
        setWorkouts(last.workouts);
      }
      notify(t('undo.done', { what: t(last.label) }));
    }
  }, [api, fail, notify]);

  // Main template edits (whole config per profile is stored)
  const writeMain = useCallback((cfg) => {
    setMainStore((ms) => ({ ...ms, [prof.id]: cfg }));
    api.saveMain(prof.id, cfg).catch(fail('err.save'));
  }, [api, fail, prof.id]);
  const cleanMainTpl = (x) => { const { builtin, ...rest } = x; return rest; };
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
    writeMain({ groups: main.groups.map((g) => (g.id === id ? { ...g, label, sub } : g)), templates: main.templates.map(cleanMainTpl) });
  }, [main, writeMain, remember]);
  const resetMain = useCallback(() => {
    remember('undo.reset');
    setMainStore((ms) => { const n = { ...ms }; delete n[prof.id]; return n; });
    api.saveMain(prof.id, null).catch(fail('err.save'));
  }, [api, fail, prof.id, remember]);
  const groupLabel = useCallback((id) => main.groups.find((g) => g.id === id)?.label || id, [main]);
  const groupSub = useCallback((id) => { const g = main.groups.find((x) => x.id === id); return g?.sub || t('groups.' + id); }, [main]);
  const setProfile = useCallback((id) => {
    setProfileState(id);
    api.saveProfile(id).catch(fail('err.save'));
  }, [api, fail]);
  const typeOf = useCallback((name) => library.find((e) => exKey(e.name) === exKey(name))?.type || defaultTypeOf(name), [library]);

  // Last logged sets of an exercise (workouts are sorted newest first).
  const lastSets = useCallback(
    (key) => {
      for (const w of workouts) {
        const e = w.exercises.find((x) => x.key === key);
        if (e && e.sets.length) return e.sets;
      }
      return null;
    },
    [workouts]
  );

  const startWorkout = useCallback(
    (tpl) => {
      const exercises = tpl.exercises.map((e) => {
        const key = exKey(e.name);
        const last = lastSets(key);
        // Prefill priority: 1) last session  2) per-set plan  3) template default weight/reps
        const sets = Array.from({ length: e.sets }, (_, i) => {
          const src = last ? last[Math.min(i, last.length - 1)] : null;
          if (src) return { weight: String(src.weight || ''), reps: String(src.reps || ''), time: String(src.time || ''), done: false };
          const p = e.plan?.[i];
          return {
            weight: String(p?.w || e.weight || ''),
            reps: String(p ? (typeof p.r === 'number' ? p.r : '') : firstNum(e.reps)),
            time: String(p?.t || e.time || ''),
            done: false,
          };
        });
        const type = e.type || typeOf(e.name);
        return { key, name: e.name, type, plan: type === 'time' ? t('count.sets', { n: e.sets }) : planLabel(e), hint: last ? '' : e.hint || '', note: e.note || '', sets };
      });
      setActive({
        id: uid(), templateId: tpl.id, name: tpl.name, group: tpl.group || '', variant: tpl.variant || '',
        startedAt: Date.now(), exercises,
      });
    },
    [lastSets, typeOf]
  );

  const startEmptyWorkout = useCallback(() => {
    setActive({ id: uid(), templateId: '', name: t('wo.emptyName'), group: '', variant: '', startedAt: Date.now(), exercises: [] });
  }, []);

  const discardWorkout = useCallback(() => setActive(null), []);

  const finishWorkout = useCallback(async () => {
    if (!active) return { empty: true };
    const finishedAt = Date.now();
    const exercises = active.exercises
      .map((e) => ({ key: e.key, name: e.name, ...(e.type === 'time' ? { type: 'time' } : {}), sets: e.sets.filter(isDone).map((s) => (e.type === 'time' ? { weight: num(s.weight), reps: 0, time: num(s.time) } : { weight: num(s.weight), reps: num(s.reps) })) }))
      .filter((e) => e.sets.length);
    if (!exercises.length) return { empty: true };

    const done = { id: active.id, templateId: active.templateId, name: active.name, group: active.group, variant: active.variant, startedAt: active.startedAt, finishedAt, exercises };
    const nextPrs = { ...prs };
    const updates = {};
    let beaten = 0;
    for (const e of exercises) {
      for (const s of e.sets) {
        if (better(s, nextPrs[e.key])) {
          if (nextPrs[e.key]) beaten += 1;
          nextPrs[e.key] = { weight: s.weight, reps: s.reps, ...(s.time ? { time: s.time } : {}), name: e.name, date: finishedAt };
          updates[e.key] = nextPrs[e.key];
        }
      }
    }
    setWorkouts((w) => [done, ...w]);
    setPrs(nextPrs);
    setActive(null);
    api.saveWorkout(done, updates).catch(fail('err.save'));
    return { empty: false, beaten };
  }, [active, prs, api, fail]);

  const deleteWorkout = useCallback((id) => {
    remember('undo.workout');
    setWorkouts((w) => w.filter((x) => x.id !== id));
    api.deleteWorkout(id).catch(fail('err.delete'));
  }, [api, fail, remember]);

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

  // Exercise library
  const saveLibrary = useCallback((list) => {
    remember('undo.library');
    setLibrary(list);
    api.saveExercises(list).catch(fail('err.save'));
  }, [api, fail, remember]);
  const addToLibrary = useCallback((ex) => {
    remember('undo.library');
    setLibrary((lib) => {
      const next = [...lib.filter((x) => exKey(x.name) !== exKey(ex.name)), { name: ex.name, cat: normCat(ex.cat), ...(ex.type === 'time' || (!ex.type && normCat(ex.cat) === 'cardio') ? { type: 'time' } : {}), ...(ex.db ? { db: ex.db } : {}) }];
      api.saveExercises(next).catch(fail('err.save'));
      return next;
    });
  }, [api, fail, remember]);
  const resetLibrary = useCallback(() => saveLibrary(EXERCISES), [saveLibrary]);
  // Guide source: bundled guide, linked DB entry, or null (= custom exercise)
  const infoOf = useCallback((name) => {
    const k = exKey(name);
    const e = library.find((x) => exKey(x.name) === k);
    if (e?.db) return { db: e.db };
    return INFO_KEYS.has(k) ? { curated: true } : null;
  }, [library]);
  const catOf = useCallback((name) => library.find((e) => exKey(e.name) === exKey(name))?.cat || null, [library]);

  const patchActive = useCallback((fn) => setActive((a) => (a ? fn(a) : a)), []);
  const addExerciseToActive = useCallback((ex) => {
    const key = exKey(ex.name);
    const last = lastSets(key);
    const type = ex.type || typeOf(ex.name);
    const sets = (last || [{ weight: '', reps: '', time: '' }]).map((s) => ({ weight: String(s.weight || ''), reps: String(s.reps || ''), time: String(s.time || ''), done: false }));
    while (sets.length < (type === 'time' ? 1 : 3)) sets.push({ ...sets[sets.length - 1], done: false });
    patchActive((a) => ({ ...a, exercises: [...a.exercises, { key, name: ex.name, type, plan: '', hint: '', note: '', sets }] }));
  }, [lastSets, patchActive, typeOf]);

  const value = {
    user, loading, mode: backend.mode,
    signIn: () => backend.signIn().catch(fail('err.login')),
    signOut: async () => {
      await backend.signOut();
      setCustom([]); setWorkouts([]); setPrs({}); setLibrary(EXERCISES); setProfileState(null); setMainStore({}); setUndoStack([]);
    },
    templates, workouts, prs, active, setActive, patchActive,
    startWorkout, startEmptyWorkout, discardWorkout, finishWorkout, deleteWorkout, saveTemplate, deleteTemplate, addExerciseToActive,
    library, saveLibrary, addToLibrary, resetLibrary, catOf, typeOf, infoOf,
    profile, prof, setProfile, main, groupLabel, groupSub, saveMainTemplate, deleteMainTemplate, renameGroup, resetMain,
    undoStack, undo,
    toast, notify,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
