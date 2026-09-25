import { useCallback } from 'react';
import { applyChanges, recomputeKeys } from '../records.js';
import { exKey, sanitizeName } from '../util.js';
import { renameInTemplate, renameInWorkouts, toLibEntry } from './model.js';

// A3: přejmenování cviku, nebo sloučení do existujícího (typicky překlep / „Chest Fly“ → „Pec Deck“).
// Přepíše historii, rekordy, knihovnu, šablony, připnuté cviky i rozdělaný trénink. Jde vrátit přes Zpět.
export function useRenameExercise({ api, fail, remember, user, acc, workouts, setWorkouts, typeOf, catOf, patchActive }) {
  const { prs, setPrs, library, setLibrary, custom, setCustom, mainCfg, setMainCfg, pinnedLifts, setPinnedLifts } = acc;

  // Náhled pro potvrzovací dialog: jde o sloučení? kolik tréninků se změní? sedí typ (opakování / čas)?
  const renamePreview = useCallback((fromName, toName) => {
    const typed = sanitizeName(toName);
    const fromKey = exKey(fromName), toKey = exKey(typed);
    // Při sloučení se použije název existujícího cviku („pec deck“ → „Pec Deck“)
    const existing = toKey === fromKey ? null
      : library.find((e) => exKey(e.name) === toKey)?.name
        || workouts.find((w) => w.exercises.some((e) => e.key === toKey))?.exercises.find((e) => e.key === toKey)?.name;
    const merge = Boolean(existing);
    const name = existing || typed;
    return {
      name, merge, same: name === sanitizeName(fromName),
      count: workouts.filter((w) => w.exercises.some((e) => e.key === fromKey)).length,
      typeClash: merge && typeOf(fromName) !== typeOf(name),
    };
  }, [library, workouts, typeOf]);

  const renameExercise = useCallback((fromName, toName) => {
    const p = renamePreview(fromName, toName);
    if (!p.name || p.same || p.typeClash) return null;
    const fromKey = exKey(fromName), toKey = exKey(p.name);
    remember('undo.rename');

    // Historie + rekordy (atomicky po batchích)
    const { list, changed } = renameInWorkouts(workouts, fromKey, p.name);
    const prChanges = recomputeKeys(new Set([fromKey, toKey]), list, prs);
    setWorkouts(list);
    setPrs(applyChanges(prs, prChanges));
    if (changed.length || Object.keys(prChanges).length) api.saveWorkouts(changed, prChanges).catch(fail('err.save'));

    // Knihovna: záznam se přejmenuje; při sloučení zůstane jen cílový
    const src = library.find((e) => exKey(e.name) === fromKey);
    const hasTarget = library.some((e) => exKey(e.name) === toKey && toKey !== fromKey);
    let lib = library.filter((e) => exKey(e.name) !== fromKey);
    if (!hasTarget) lib = [...lib, toLibEntry(src ? { ...src, name: p.name } : { name: p.name, cat: catOf(fromName) || 'other', type: typeOf(fromName) })];
    setLibrary(lib);
    api.saveExercises(lib).catch(fail('err.save'));

    // Vlastní a hlavní šablony
    for (const tpl of custom) {
      const next = renameInTemplate(tpl, fromKey, p.name);
      if (next) api.saveTemplate(next).catch(fail('err.save'));
    }
    setCustom((c) => c.map((x) => renameInTemplate(x, fromKey, p.name) || x));
    if (mainCfg?.templates?.length) {
      let touched = false;
      const templates = mainCfg.templates.map((x) => { const n = renameInTemplate(x, fromKey, p.name); if (n) touched = true; return n || x; });
      if (touched) { const cfg = { ...mainCfg, templates }; setMainCfg(cfg); api.saveMain(cfg).catch(fail('err.save')); }
    }

    // Připnuté cviky ve statistikách
    if (pinnedLifts.includes(fromKey)) {
      const pins = [...new Set(pinnedLifts.map((k) => (k === fromKey ? toKey : k)))];
      setPinnedLifts(pins);
      try { localStorage.setItem(`forge:pins:${user?.uid}`, JSON.stringify(pins)); } catch { /* ignore */ }
      api.saveSettings({ pinnedLifts: pins }).catch((e) => console.warn('settings', e));
    }

    // Rozdělaný trénink – jinak by se po dokončení uložil pod starým názvem
    patchActive((a) => {
      if (!a.exercises.some((e) => e.key === fromKey)) return a;
      const out = [];
      for (const e of a.exercises) {
        const cur = e.key === fromKey ? { ...e, key: toKey, name: p.name } : e;
        const at = cur.key === toKey ? out.findIndex((x) => x.key === toKey) : -1;
        if (at < 0) out.push(cur);
        else out[at] = { ...out[at], sets: [...out[at].sets, ...cur.sets] }; // sloučení: série pod jeden cvik
      }
      return { ...a, exercises: out };
    });

    return { name: p.name, merged: p.merge, count: changed.length };
  }, [renamePreview, remember, workouts, prs, setWorkouts, setPrs, api, fail, library, setLibrary, catOf, typeOf, custom, setCustom,
    mainCfg, setMainCfg, pinnedLifts, setPinnedLifts, user?.uid, patchActive]);

  return { renamePreview, renameExercise };
}
