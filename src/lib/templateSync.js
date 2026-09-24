// W4: porovnání aktivního tréninku se šablonou a přenesení změn (cviky, pořadí, počet sérií, supersety).
import { exKey } from './util.js';

const working = (e) => e.sets.filter((s) => !s.warm).length;
const shape = (list) => list.map((e) => `${e.key}:${e.sets}:${e.ss || ''}`).join('|');

// Změnila se struktura tréninku oproti šabloně?
export function templateDiffers(tpl, active) {
  if (!tpl || !active) return false;
  const a = active.exercises.filter((e) => working(e) > 0).map((e) => ({ key: e.key, sets: working(e), ss: e.ss || '' }));
  const b = tpl.exercises.map((e) => ({ key: exKey(e.name), sets: e.sets, ss: e.ss || '' }));
  return shape(a) !== shape(b);
}

// Nová podoba šablony podle tréninku. Stávající cviky si nechají opakování, váhu, poznámky;
// plán po sériích zůstane jen při stejném počtu sérií.
export function templateFromActive(tpl, active) {
  const byKey = new Map(tpl.exercises.map((e) => [exKey(e.name), e]));
  const exercises = active.exercises.filter((e) => working(e) > 0).map((e) => {
    const sets = working(e);
    const old = byKey.get(e.key);
    if (old) {
      const { plan, ...rest } = old;
      return { ...rest, ...(plan && plan.length === sets ? { plan } : {}), sets, ss: e.ss || '' };
    }
    const first = e.sets.find((s) => !s.warm) || {};
    return {
      name: e.name, sets, reps: e.type === 'time' ? '' : String(parseInt(first.reps, 10) || 8), weight: '', hint: '', note: '',
      ...(e.type === 'time' ? { type: 'time', time: Number(first.time) || 10 } : {}), ss: e.ss || '',
    };
  });
  return { ...tpl, exercises };
}
