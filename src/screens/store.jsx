import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { backend } from './backend.js';
import { DEFAULT_TEMPLATES } from '../data/defaultTemplates.js';
import { EXERCISES, modernName, normCat } from '../data/exercises.js';
import { better, exKey, firstNum, isDone, num, planLabel, uid } from './util.js';
import { t } from './i18n.js';

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
  const list = (doc.list || []).map((e) => ({ name: modernName(e.name), cat: normCat(e.cat) }));
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

  const templates = useMemo(() => [...DEFAULT_TEMPLATES, ...custom], [custom]);

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
          if (src) return { weight: String(src.weight || ''), reps: String(src.reps ?? ''), done: false };
          const p = e.plan?.[i];
          return {
            weight: String(p?.w ?? e.weight ?? ''),
            reps: String(p ? (typeof p.r === 'number' ? p.r : '') : firstNum(e.reps)),
            done: false,
          };
        });
        return { key, name: e.name, plan: planLabel(e), hint: last ? '' : e.hint || '', note: e.note || '', sets };
      });
      setActive({
        id: uid(), templateId: tpl.id, name: tpl.name, group: tpl.group || '', variant: tpl.variant || '',
        startedAt: Date.now(), exercises,
      });
    },
    [lastSets]
  );

  const startEmptyWorkout = useCallback(() => {
    setActive({ id: uid(), templateId: '', name: t('wo.emptyName'), group: '', variant: '', startedAt: Date.now(), exercises: [] });
  }, []);

  const discardWorkout = useCallback(() => setActive(null), []);

  const finishWorkout = useCallback(async () => {
    if (!active) return { empty: true };
    const finishedAt = Date.now();
    const exercises = active.exercises
      .map((e) => ({ key: e.key, name: e.name, sets: e.sets.filter(isDone).map((s) => ({ weight: num(s.weight), reps: num(s.reps) })) }))
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
          nextPrs[e.key] = { weight: s.weight, reps: s.reps, name: e.name, date: finishedAt };
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
    setWorkouts((w) => w.filter((x) => x.id !== id));
    api.deleteWorkout(id).catch(fail('err.delete'));
  }, [api, fail]);

  const saveTemplate = useCallback((tpl) => {
    setCustom((c) => [...c.filter((x) => x.id !== tpl.id), tpl]);
    api.saveTemplate(tpl).catch(fail('err.save'));
  }, [api, fail]);

  const deleteTemplate = useCallback((id) => {
    setCustom((c) => c.filter((x) => x.id !== id));
    api.deleteTemplate(id).catch(fail('err.delete'));
  }, [api, fail]);

  // Exercise library
  const saveLibrary = useCallback((list) => {
    setLibrary(list);
    api.saveExercises(list).catch(fail('err.save'));
  }, [api, fail]);
  const addToLibrary = useCallback((ex) => {
    setLibrary((lib) => {
      const next = [...lib.filter((x) => exKey(x.name) !== exKey(ex.name)), { name: ex.name, cat: normCat(ex.cat) }];
      api.saveExercises(next).catch(fail('err.save'));
      return next;
    });
  }, [api, fail]);
  const resetLibrary = useCallback(() => saveLibrary(EXERCISES), [saveLibrary]);
  const catOf = useCallback((name) => library.find((e) => exKey(e.name) === exKey(name))?.cat || null, [library]);

  const patchActive = useCallback((fn) => setActive((a) => (a ? fn(a) : a)), []);
  const addExerciseToActive = useCallback((ex) => {
    const key = exKey(ex.name);
    const last = lastSets(key);
    const sets = (last || [{ weight: '', reps: '' }]).map((s) => ({ weight: String(s.weight || ''), reps: String(s.reps || ''), done: false }));
    while (sets.length < 3) sets.push({ ...sets[sets.length - 1], done: false });
    patchActive((a) => ({ ...a, exercises: [...a.exercises, { key, name: ex.name, plan: '', hint: '', note: '', sets }] }));
  }, [lastSets, patchActive]);

  const value = {
    user, loading, mode: backend.mode,
    signIn: () => backend.signIn().catch(fail('err.login')),
    signOut: async () => {
      await backend.signOut();
      setCustom([]); setWorkouts([]); setPrs({}); setLibrary(EXERCISES);
    },
    templates, workouts, prs, active, setActive, patchActive,
    startWorkout, startEmptyWorkout, discardWorkout, finishWorkout, deleteWorkout, saveTemplate, deleteTemplate, addExerciseToActive,
    library, saveLibrary, addToLibrary, resetLibrary, catOf,
    toast, notify,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
