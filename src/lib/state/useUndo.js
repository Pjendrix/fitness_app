import { useCallback, useRef, useState } from 'react';
import { applyChanges, recomputeKeys } from '../records.js';
import { t } from '../i18n.js';
import { byStart } from './model.js';

// Undo / Redo (posledních 5 změn šablon, knihovny a historie).
// Položka = snímek stavu; `drop` = id tréninků, které obnova přidala (a zrušení obnovy je má zase smazat).
export function useUndo({ api, fail, notify, state, setters }) {
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const { setCustom, setLibrary, setMainCfg, setPrs, setWorkouts } = setters;
  const snap = useRef({});
  snap.current = state;
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
  }, [api, fail, setCustom, setLibrary, setMainCfg, setPrs, setWorkouts]);

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

  const resetUndo = useCallback(() => { setUndoStack([]); setRedoStack([]); }, []);
  return { undoStack, redoStack, remember, undo, redo, resetUndo };
}
