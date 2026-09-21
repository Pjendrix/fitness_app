import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { backend } from './backend.js';
import { DEFAULT_TEMPLATES } from '../data/defaultTemplates.js';
import { better, exKey, firstNum, isDone, num, planLabel, uid } from './util.js';

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

export function StoreProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = načítá se, null = odhlášen
  const [loading, setLoading] = useState(false);
  const [custom, setCustom] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [prs, setPrs] = useState({});
  const [customExercises, setCustomExercises] = useState([]);
  const [active, setActive] = useState(loadDraft);
  const [toast, setToast] = useState(null);

  const api = useMemo(() => (user ? backend.data(user.uid) : null), [user]);

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
        setCustom(d.templates);
        setWorkouts(d.workouts);
        setPrs(d.prs);
        setCustomExercises(d.exercises || []);
      })
      .catch((e) => notify('Načtení dat selhalo: ' + e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  useEffect(() => {
    if (active) localStorage.setItem(DRAFT, JSON.stringify(active));
    else localStorage.removeItem(DRAFT);
  }, [active]);

  const notify = useCallback((msg) => {
    setToast({ msg, id: Date.now() });
    setTimeout(() => setToast((t) => (t && Date.now() - t.id >= 2800 ? null : t)), 3000);
  }, []);

  const templates = useMemo(() => [...DEFAULT_TEMPLATES, ...custom], [custom]);

  // Poslední odcvičené série daného cvičení (workouts jsou seřazené od nejnovějšího).
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
        // Priorita předvyplnění: 1) poslední trénink z historie  2) plán série ze šablony  3) výchozí váha/opakování
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
        id: uid(),
        templateId: tpl.id,
        name: tpl.name,
        group: tpl.group || '',
        variant: tpl.variant || '',
        startedAt: Date.now(),
        exercises,
      });
    },
    [lastSets]
  );

  const discardWorkout = useCallback(() => setActive(null), []);

  const finishWorkout = useCallback(async () => {
    if (!active) return { empty: true };
    const finishedAt = Date.now();
    const exercises = active.exercises
      .map((e) => ({
        key: e.key,
        name: e.name,
        sets: e.sets.filter(isDone).map((s) => ({ weight: num(s.weight), reps: num(s.reps) })),
      }))
      .filter((e) => e.sets.length);
    if (!exercises.length) return { empty: true };

    const done = { id: active.id, templateId: active.templateId, name: active.name, group: active.group, variant: active.variant, startedAt: active.startedAt, finishedAt, exercises };
    const nextPrs = { ...prs };
    const updates = {};
    let beaten = 0;
    for (const e of exercises) {
      for (const s of e.sets) {
        const cand = { weight: s.weight, reps: s.reps };
        if (better(cand, nextPrs[e.key])) {
          if (nextPrs[e.key]) beaten += 1;
          nextPrs[e.key] = { ...cand, name: e.name, date: finishedAt };
          updates[e.key] = nextPrs[e.key];
        }
      }
    }
    // Lokální stav se aktualizuje hned (Firestore má offline cache), zápis běží na pozadí.
    setWorkouts((w) => [done, ...w]);
    setPrs(nextPrs);
    setActive(null);
    api.saveWorkout(done, updates).catch((e) => notify('Uložení selhalo: ' + e.message));
    return { empty: false, beaten };
  }, [active, prs, api, notify]);

  const deleteWorkout = useCallback(
    (id) => {
      setWorkouts((w) => w.filter((x) => x.id !== id));
      api.deleteWorkout(id).catch((e) => notify('Smazání selhalo: ' + e.message));
    },
    [api, notify]
  );

  const saveTemplate = useCallback(
    (tpl) => {
      setCustom((c) => [...c.filter((x) => x.id !== tpl.id), tpl]);
      api.saveTemplate(tpl).catch((e) => notify('Uložení šablony selhalo: ' + e.message));
    },
    [api, notify]
  );

  const deleteTemplate = useCallback(
    (id) => {
      setCustom((c) => c.filter((x) => x.id !== id));
      api.deleteTemplate(id).catch((e) => notify('Smazání šablony selhalo: ' + e.message));
    },
    [api, notify]
  );

  const addCustomExercise = useCallback(
    (ex) => {
      setCustomExercises((list) => {
        const next = [...list.filter((x) => x.name !== ex.name), ex];
        api.saveExercises(next).catch((e) => notify('Uložení cvičení selhalo: ' + e.message));
        return next;
      });
    },
    [api, notify]
  );

  // Úpravy aktivního tréninku
  const patchActive = useCallback((fn) => setActive((a) => (a ? fn(a) : a)), []);
  const addExerciseToActive = useCallback(
    (ex) => {
      const key = exKey(ex.name);
      const last = lastSets(key);
      const sets = (last || [{ weight: '', reps: '' }]).slice(0, Math.max(3, last?.length || 0)).map((s) => ({ weight: String(s.weight || ''), reps: String(s.reps || ''), done: false }));
      while (sets.length < 3) sets.push({ ...sets[sets.length - 1], done: false });
      patchActive((a) => ({ ...a, exercises: [...a.exercises, { key, name: ex.name, plan: '', hint: '', note: '', sets }] }));
    },
    [lastSets, patchActive]
  );

  const value = {
    user, loading, mode: backend.mode,
    signIn: () => backend.signIn().catch((e) => notify('Přihlášení selhalo: ' + e.message)),
    signOut: async () => {
      await backend.signOut();
      setCustom([]); setWorkouts([]); setPrs({}); setCustomExercises([]);
    },
    templates, workouts, prs, active, setActive,
    startWorkout, discardWorkout, finishWorkout, deleteWorkout, saveTemplate, deleteTemplate,
    toast, notify,
    customExercises, addCustomExercise, patchActive, addExerciseToActive,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
