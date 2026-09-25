import { useCallback, useEffect, useRef, useState } from 'react';
import { HISTORY_LIMIT } from '../backend.js';
import { applyChanges, recomputeKeys } from '../records.js';
import { migrateWorkout } from './model.js';

// Historie tréninků – živý odběr z offline cache Firestore; metadata říkají, co čeká na odeslání.
export function useHistoryData(api, fail) {
  const [workouts, setWorkouts] = useState([]);
  const [workoutsReady, setWorkoutsReady] = useState(false);
  const [sync, setSync] = useState({ pending: false, fromCache: false });

  useEffect(() => {
    if (!api) return undefined;
    let cancelled = false;
    setWorkoutsReady(false);
    const unsub = api.subscribeWorkouts(
      (list, meta) => { if (cancelled) return; setWorkouts(list.map(migrateWorkout)); setSync(meta); setWorkoutsReady(true); },
      (e) => { fail('err.load')(e); setWorkoutsReady(true); },
    );
    return () => { cancelled = true; unsub(); };
  }, [api, fail]);

  const resetHistory = useCallback(() => setWorkouts([]), []);
  return { workouts, setWorkouts, workoutsReady, sync, resetHistory };
}

// Srovnání rekordů s historií (jednou po načtení ze serveru). Opraví rekordy, které zůstaly po tréninku
// smazaném dřív, a doplní chybějící. Když je historie na limitu, nesrovnává (starší tréninky nejsou načtené).
export function useRecordsReconcile({ api, fail, prs, setPrs, workouts, workoutsReady, sync, metaLoading }) {
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
  }, [api, metaLoading, workoutsReady, sync.fromCache, workouts, prs, setPrs, fail]);
}
