// Cíl progrese a rekordy – čisté funkce (testy v progress.test.js).
import { better, defaultTop, exKey, num } from './util.js';
export { defaultTop };
import { e1rm } from './metrics.js';

// Rozsah opakování ze šablony. Horní hranice: zadaná v šabloně (repsTo), jinak do 6 opak. +2, od 7 výš +4
// (hrubé kroky strojů potřebují širší rozsah). „8-12“ jde zapsat i přímo. „max“ / „pyramid“ → null (jen +1).
export const DEFAULT_RANGE = { lo: 8, hi: 12 };
export function repRange(spec, to) {
  if (spec == null || spec === '') return null;
  const s = String(spec).trim().toLowerCase();
  if (s === 'max' || s === 'pyramid') return null;
  const m = s.match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if (m) { const lo = +m[1], hi = +m[2]; return hi >= lo ? { lo, hi } : { lo: hi, hi: lo }; }
  const n = parseInt(s, 10);
  if (!(n > 0)) return null;
  const top = parseInt(to, 10);
  return { lo: n, hi: top >= n ? top : defaultTop(n) };
}

// Krok váhy podle vybavení (z názvu); přesnější je naučený krok z historie nebo ručně nastavený v knihovně.
export function defaultStep(name) {
  const n = String(name || '').toLowerCase();
  if (/smith/.test(n)) return 2.5;
  if (/machine|cable|pec deck|pulldown|pushdown|leg press|leg curl|leg extension|seated row|hack squat|crossover|kickback|abduction|adduction|face pull|crunch \(|row \(machine/.test(n)) return 5;
  if (/dumbbell|db |one-arm|hammer|concentration|lateral raise|goblet/.test(n)) return 2;
  return 2.5;
}
// Naučený krok: nejmenší rozdíl mezi různými váhami, které u cviku kdy byly (10/15/20 → 5).
export function learnedSteps(workouts) {
  const w = new Map();
  for (const wo of workouts) for (const e of wo.exercises) {
    const set = w.get(e.key) || new Set();
    for (const s of e.sets) { const v = num(s.weight); if (v > 0) set.add(Math.round(v * 4) / 4); }
    w.set(e.key, set);
  }
  const out = new Map();
  for (const [k, set] of w) {
    const list = [...set].sort((a, b) => a - b);
    let min = Infinity;
    for (let i = 1; i < list.length; i++) min = Math.min(min, list[i] - list[i - 1]);
    if (Number.isFinite(min) && min >= 0.5) out.set(k, Math.round(min * 4) / 4);
  }
  return out;
}

// Cíle pro celý cvik (dvojitá progrese). prev = minulé pracovní série, specs = opakování po sériích (plán),
// spec/to = rozsah ze šablony, step = krok váhy.
// Váha se přidá až když VŠECHNY série dosáhly horní hranice; do té doby +1 opakování (série na hranici drží).
// → pole cílů po sériích: { weight, reps, hold? } | null
export function exerciseTargets(prev, { specs, spec, to, step = 2.5 } = {}) {
  if (!prev?.length) return [];
  const rows = prev.map((p, j) => {
    const weight = num(p.weight), reps = num(p.reps);
    if (num(p.time) > 0 || !(reps > 0)) return { p: null };
    const sp = specs ? specs[j] : spec;
    const range = weight > 0 ? (sp === undefined ? DEFAULT_RANGE : repRange(sp, specs ? undefined : to)) : null;
    return { p: { weight, reps }, range };
  });
  const ranged = rows.filter((r) => r.p && r.range);
  const allTop = ranged.length > 0 && ranged.length === rows.filter((r) => r.p && r.p.weight > 0).length && ranged.every((r) => r.p.reps >= r.range.hi);
  return rows.map(({ p, range }) => {
    if (!p) return null;
    if (!range) return { weight: p.weight, reps: p.reps + 1 }; // vlastní váha / „max“
    if (allTop) return { weight: Math.round((p.weight + step) * 100) / 100, reps: range.lo };
    if (p.reps >= range.hi) return { weight: p.weight, reps: p.reps, hold: true };
    return { weight: p.weight, reps: p.reps + 1 };
  });
}

// Jedna série (detail cviku): cíl nejtěžší série z posledního tréninku
export function nextTarget(last, spec, step) {
  return exerciseTargets(last ? [last] : [], { spec, step: step ?? defaultStep('') })[0] || null;
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
  for (const tpl of templates) for (const e of tpl.exercises) if (exKey(e.name) === key) return { spec: e.reps, to: e.repsTo };
  return { spec: undefined, to: undefined };
}
