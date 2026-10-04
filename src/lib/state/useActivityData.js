import { useCallback, useEffect, useMemo, useState } from 'react';
import { activityEntry, validActivity } from '../cardio.js';

// Kardio aktivity účtu (users/{uid}/activities) – živý odběr + zápis / mazání.
// Chyba odběru (např. ještě nenasazená pravidla) jen zaloguje – zbytek appky jede dál.
export function useActivityData(api, fail) {
  const [activities, setActivities] = useState([]); // [{ id, date, kind, minutes, vigorous }] od nejnovějšího

  useEffect(() => {
    if (!api?.subscribeActivities) { setActivities([]); return undefined; }
    let cancelled = false;
    const unsub = api.subscribeActivities((list) => { if (!cancelled) setActivities(list); }, (e) => console.warn('activities', e?.code || e));
    return () => { cancelled = true; unsub(); };
  }, [api]);

  const saveActivity = useCallback((input) => {
    const a = activityEntry(input);
    if (!validActivity(a)) return false;
    setActivities((l) => [a, ...l].sort((x, y) => y.date - x.date));
    api.saveActivity(a).catch((e) => { setActivities((l) => l.filter((x) => x.id !== a.id)); fail('err.save')(e); });
    return true;
  }, [api, fail]);
  const deleteActivity = useCallback((id) => {
    let removed = null;
    setActivities((l) => { removed = l.find((x) => x.id === id) || null; return l.filter((x) => x.id !== id); });
    api.deleteActivity(id).catch((e) => { if (removed) setActivities((l) => [removed, ...l].sort((x, y) => y.date - x.date)); fail('err.delete')(e); });
  }, [api, fail]);

  return useMemo(() => ({ activities, saveActivity, deleteActivity }), [activities, saveActivity, deleteActivity]);
}
