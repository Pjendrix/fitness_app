import { useCallback, useMemo } from 'react';
import { HISTORY_LIMIT } from '../backend.js';
import { applyChanges, changesAfterDelete, recomputeKeys } from '../records.js';
import { exKey, LIMITS, sanitizeName } from '../util.js';
import { t } from '../i18n.js';
import { byStart, keepExercises, normalizeExercise, normalizeImported, toLibEntry } from './model.js';

// Akce nad historií: smazání, úprava, import zálohy. Rekordy dotčených cviků se vždy přepočítají.
export function useHistoryActions({ api, fail, remember, workouts, setWorkouts, prs, setPrs, library, setLibrary, setCustom }) {
  const deleteWorkout = useCallback((id) => {
    const w = workouts.find((x) => x.id === id);
    if (!w) return;
    remember('undo.workout');
    const remaining = workouts.filter((x) => x.id !== id);
    const changes = changesAfterDelete(w, remaining, prs);
    setWorkouts(remaining);
    setPrs((p) => applyChanges(p, changes));
    api.deleteWorkout(id, changes).catch(fail('err.delete'));
  }, [workouts, prs, api, fail, remember, setWorkouts, setPrs]);

  // Úprava tréninku z historie (název, datum, délka, série). Poznámka, RPE a superset cviku zůstanou (dřív se ztrácely).
  const updateWorkout = useCallback((edited) => {
    const old = workouts.find((x) => x.id === edited.id);
    if (!old) return false;
    const exercises = keepExercises(edited.exercises.map((e) => normalizeExercise(e)));
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
  }, [workouts, prs, api, fail, remember, setWorkouts, setPrs]);

  // Import zálohy (JSON z exportu). Slučuje: existující tréninky se stejným id se přeskočí, šablony se přepíšou.
  const importData = useCallback(async (raw) => {
    const d = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!d || !Array.isArray(d.workouts)) throw new Error('format');
    if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('offline'); // B5: offline by čekání nikdy neskončilo
    const have = new Set(workouts.map((w) => w.id));
    const fresh = d.workouts
      .filter((w) => w && !have.has(w.id))
      .map((w) => normalizeImported(w, t('wo.emptyName')))
      .filter(Boolean)
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
    for (const x of tpls) {
      const tpl = { ...x, name: sanitizeName(x.name) || t('tpl.name'), exercises: x.exercises.slice(0, LIMITS.exercises) };
      setCustom((c) => [...c.filter((y) => y.id !== tpl.id), tpl]);
      api.saveTemplate(tpl).catch(fail('err.save'));
    }
    let added = 0;
    if (lib.length) {
      const known = new Set(library.map((e) => exKey(e.name)));
      const extra = lib.map(toLibEntry).filter((e) => e.name && !known.has(exKey(e.name)));
      added = extra.length;
      if (added) { const next = [...library, ...extra].slice(0, LIMITS.library); setLibrary(next); api.saveExercises(next).catch(fail('err.save')); }
    }
    return { workouts: fresh.length, templates: tpls.length, exercises: added };
  }, [workouts, prs, library, api, fail, setWorkouts, setPrs, setCustom, setLibrary]);

  return useMemo(() => ({ deleteWorkout, updateWorkout, importData }), [deleteWorkout, updateWorkout, importData]);
}
