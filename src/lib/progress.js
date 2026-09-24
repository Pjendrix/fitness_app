// Cíl progrese a rekordy – čisté funkce (testy v progress.test.js).
import { better, exKey, num } from './util.js';
import { e1rm } from './metrics.js';
import { weightStep } from '../components/NumField.jsx';

// Rozsah opakování ze šablony: „8“ → 8–10 (dvojitá progrese, +2), „8-12“ → 8–12, „max“ → null (jen +1).
export const DEFAULT_RANGE = { lo: 8, hi: 12 };
export function repRange(spec) {
  if (spec == null || spec === '') return null;
  const s = String(spec).trim().toLowerCase();
  if (s === 'max' || s === 'pyramid') return null;
  const m = s.match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if (m) { const lo = +m[1], hi = +m[2]; return hi >= lo ? { lo, hi } : { lo: hi, hi: lo }; }
  const n = parseInt(s, 10);
  return n > 0 ? { lo: n, hi: n + 2 } : null;
}

// Cíl pro jednu sérii podle minulé: pod horní hranicí +1 opakování, na ní +váha a zpět na spodní hranici.
// spec: text opakování ze šablony (nebo číslo z plánu); undefined = cvik bez šablony → 8–12.
export function nextTarget(last, spec) {
  if (!last) return null;
  const weight = num(last.weight), reps = num(last.reps), time = num(last.time);
  if (time > 0) return null; // cviky na čas bez cíle
  if (!(reps > 0)) return null;
  if (!(weight > 0)) return { weight: 0, reps: reps + 1 }; // vlastní váha
  const range = spec === undefined ? DEFAULT_RANGE : repRange(spec);
  if (!range) return { weight, reps: reps + 1 };
  if (reps < range.hi) return { weight, reps: reps + 1 };
  return { weight: Math.round((weight + weightStep(weight, 1)) * 100) / 100, reps: range.lo };
}

// Rekordy po trénincích (chronologicky). Počítá se jen překonání existujícího rekordu, ne první záznam cviku.
// → Map(workoutId → [{ key, name, kind: 'pb'|'e1'|'reps', weight, reps, time, e1 }]) – max. jeden záznam na cvik.
export function recordsTimeline(workouts) {
  const out = new Map();
  const bestSet = new Map(), bestE1 = new Map(), repsAt = new Map();
  for (const w of [...workouts].sort((a, b) => a.startedAt - b.startedAt)) {
    const list = [];
    for (const e of w.exercises) {
      const sets = e.sets.map((s) => ({ weight: num(s.weight), reps: num(s.reps), time: num(s.time) }));
      const had = bestSet.has(e.key);
      let hit = null;
      // 1) klasický PB (váha, pak opakování; u času délka)
      let top = null;
      for (const s of sets) if (better(s, top)) top = s;
      if (top && better(top, bestSet.get(e.key))) {
        if (had) hit = { kind: 'pb', ...top };
        bestSet.set(e.key, top);
      }
      // 2) odhad 1RM
      const e1 = Math.max(0, ...sets.filter((s) => s.weight > 0 && !(s.time > 0)).map((s) => e1rm(s.weight, s.reps)));
      if (e1 > 0) {
        const prev = bestE1.get(e.key);
        if (prev != null && e1 > prev + 0.05 && !hit) hit = { kind: 'e1', e1: Math.round(e1 * 10) / 10 };
        if (prev == null || e1 > prev) bestE1.set(e.key, e1);
      }
      // 3) nejvíc opakování s danou váhou
      const at = repsAt.get(e.key) || new Map();
      for (const s of sets) {
        if (!(s.weight > 0) || s.time > 0) continue;
        const prev = at.get(s.weight);
        if (prev != null && s.reps > prev && !hit) hit = { kind: 'reps', weight: s.weight, reps: s.reps };
        if (prev == null || s.reps > prev) at.set(s.weight, s.reps);
      }
      repsAt.set(e.key, at);
      if (hit) list.push({ key: e.key, name: e.name, ...hit });
    }
    if (list.length) out.set(w.id, list);
  }
  return out;
}

// Rekordy jednoho cviku pro detail: nejlepší e1RM + nejvíc opakování s každou váhou.
export function exerciseRecords(workouts, key) {
  let e1 = null;
  const at = new Map();
  for (const w of workouts) for (const e of w.exercises) {
    if (e.key !== key) continue;
    for (const s of e.sets) {
      const weight = num(s.weight), reps = num(s.reps);
      if (!(weight > 0) || num(s.time) > 0 || !(reps > 0)) continue;
      const v = e1rm(weight, reps);
      if (!e1 || v > e1.value) e1 = { value: Math.round(v * 10) / 10, date: w.startedAt, weight, reps };
      const cur = at.get(weight);
      if (!cur || reps > cur.reps) at.set(weight, { weight, reps, date: w.startedAt });
    }
  }
  const reps = [...at.values()].sort((a, b) => b.weight - a.weight).slice(0, 5);
  return { e1, reps };
}

// Rozsah opakování cviku podle šablon (pro cíl mimo trénink, např. v detailu cviku)
export function specFromTemplates(templates, key) {
  for (const tpl of templates) for (const e of tpl.exercises) if (exKey(e.name) === key) return e.reps;
  return undefined;
}
