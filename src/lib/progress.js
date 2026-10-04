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

// Cílová rezerva (RIR) podle typu cviku: základní vícekloubové cviky 2–3 opakování v rezervě, izolace a stroje 0–2.
// (ACSM 2026: trénink do selhání je volitelný; Refalo 2024: selhání vs. 1–2 RIR → podobný růst, horší pocit.)
const COMPOUND = /squat|deadlift|bench|press|row|pull-?up|chin-?up|pulldown|dip|lunge|hip thrust|clean|good morning/;
const ISOLATION = /curl|extension|raise|fly|flye|pushdown|kickback|crunch|calf|shrug|pec deck|crossover|face pull|abduction|adduction|machine|cable/;
// Vícekloubový (základní) cvik podle názvu – RIR cíl a výběr silových milníků
export function isCompound(name) {
  const n = String(name || '').toLowerCase();
  return COMPOUND.test(n) && !ISOLATION.test(n.replace(/\(machine\)|\(cable\)|\(smith[^)]*\)/g, ''));
}
export const rirTarget = (name) => (isCompound(name) ? '2–3' : '0–2');

// Lehké váhy: když krok váhy znamená velký relativní skok (3 kg → 5 kg = +67 %), progreduje se nejdřív přes víc opakování.
const WIDE = 0.25, MID = 0.125;
export function widenRange(range, weight, step) {
  if (!range || !(weight > 0) || !(step > 0)) return range;
  const ratio = step / weight;
  const extra = ratio > WIDE ? 6 : ratio > MID ? 3 : 0;
  return extra ? { lo: range.lo, hi: Math.min(25, range.hi + extra), wide: true } : range;
}
const roundTo = (v, step) => Math.max(step, Math.round(v / step) * step);
const MAX_CAP = 15; // „max“ série s váhou: dál než 15 opakování už aplikace netlačí
const BW_CAP = 20; // vlastní váha: od 20 opakování raději přidat zátěž / těžší variantu
const bestE1 = (sets) => Math.max(0, ...(sets || []).filter((s) => num(s.weight) > 0 && num(s.reps) > 0 && !(num(s.time) > 0)).map((s) => e1rm(num(s.weight), num(s.reps))));

// Stagnace: 3 poslední tréninky cviku nepřekonaly nejlepší odhad 1RM tréninku před nimi.
// recent = pracovní série posledních tréninků cviku (od nejnovějšího), recent[0] = minule.
export function isStalled(recent) {
  if (!recent || recent.length < 4) return false;
  const last3 = Math.max(bestE1(recent[0]), bestE1(recent[1]), bestE1(recent[2]));
  const before = bestE1(recent[3]);
  return before > 0 && last3 > 0 && last3 <= before + 0.05;
}

// Cíle pro celý cvik (dvojitá progrese s brzdou). prev = minulé pracovní série (s RPE), specs = opakování po sériích (plán),
// spec/to = rozsah ze šablony, step = krok váhy, recent = posledních až 4 tréninků cviku (stagnace), deload = lehký týden.
// Pořadí rozhodování: lehký týden → stagnace (−10 %) → horní hranice + RPE ≥ 9,5 (ověřit) → horní hranice (+ krok)
// → minule RPE 10 (držet) → +1 opakování. Série na horní hranici drží, dokud ji nedoženou ostatní.
// Pyramida / vzestupné série: rozhoduje nejtěžší série s rozsahem, ne rozcvičení na začátku.
// → pole cílů po sériích: { weight, reps, hold?, state? } | null
//   state: 'deload' | 'reset' | 'verify' | 'up' (přidat váhu) | 'cap' (strop opakování) | 'load' (přidat zátěž) | 'easy' (minule RPE 10)
export function exerciseTargets(prev, { specs, spec, to, step = 2.5, recent = null, deload = false } = {}) {
  if (!prev?.length) return [];
  const rows = prev.map((p, j) => {
    const weight = num(p.weight), reps = num(p.reps), rpe = num(p.rpe);
    if (num(p.time) > 0 || !(reps > 0)) return { p: null };
    const sp = specs ? specs[j] : spec;
    const isMax = String(sp ?? '').trim().toLowerCase() === 'max';
    const base = weight > 0 ? (sp === undefined ? DEFAULT_RANGE : repRange(sp, specs ? undefined : to)) : null;
    return { p: { weight, reps, rpe }, range: widenRange(base, weight, step), isMax };
  });
  // Lehký týden: „light“ = váhy −12,5 % (zaokrouhleno na krok), stejná opakování; „short“ / true = stejné váhy
  if (deload) {
    const lighter = deload === 'light';
    return rows.map(({ p }) => (p ? { weight: lighter && p.weight > 0 ? roundTo(p.weight * 0.875, step) : p.weight, reps: p.reps, hold: true, state: 'deload' } : null));
  }
  const weighted = rows.filter((r) => r.p && r.p.weight > 0);
  const ranged = rows.filter((r) => r.p && r.range);
  // Vzestupné / pyramidové série (různé váhy) → rozhoduje nejtěžší série s rozsahem
  const varied = specs && new Set(ranged.map((r) => r.p.weight)).size > 1;
  const top = varied ? Math.max(...ranged.map((r) => r.p.weight)) : null;
  const judged = varied ? ranged.filter((r) => r.p.weight === top) : ranged;
  const unrangedWeighted = weighted.filter((r) => !r.range && !r.isMax).length; // „pyramid“ bez rozsahu
  const allTop = judged.length > 0 && unrangedWeighted === 0 && judged.every((r) => r.p.reps >= r.range.hi);
  const hard = judged.some((r) => r.p.rpe >= 9.5);
  const failed = ranged.some((r) => r.p.rpe >= 10 && !r.isMax);
  const stalled = ranged.length > 0 && isStalled(recent);

  return rows.map(({ p, range, isMax }) => {
    if (!p) return null;
    if (!range) {
      // Vlastní váha / „max“: +1 opakování, ale se stropem – dál se progreduje zátěží nebo těžší variantou
      if (!(p.weight > 0)) return p.reps >= BW_CAP ? { weight: 0, reps: p.reps, hold: true, state: 'load' } : { weight: 0, reps: p.reps + 1 };
      if (isMax || !specs) return p.reps >= MAX_CAP ? { weight: p.weight, reps: p.reps, hold: true, state: 'cap' } : { weight: p.weight, reps: p.reps + 1 };
      return { weight: p.weight, reps: p.reps + 1 };
    }
    if (stalled) return { weight: roundTo(p.weight * 0.9, step), reps: p.reps, state: 'reset' };
    if (allTop && hard) return { weight: p.weight, reps: p.reps, hold: true, state: 'verify' };
    if (allTop) return { weight: Math.round((p.weight + step) * 100) / 100, reps: range.lo, state: 'up' };
    if (failed) return { weight: p.weight, reps: p.reps, hold: true, state: 'easy' };
    if (p.reps >= range.hi) return { weight: p.weight, reps: p.reps, hold: true };
    return { weight: p.weight, reps: p.reps + 1 };
  });
}

// Poslední tréninky každého cviku: Map(key → [pracovní série tréninku, …]) od nejnovějšího, max. 4 (stagnace).
// skip(w) → true = trénink se nepočítá (lehký týden – stejné váhy nejsou stagnace)
export function recentSessions(workouts, n = 4, skip = null) {
  const out = new Map();
  for (const w of [...workouts].sort((a, b) => b.startedAt - a.startedAt)) {
    if (skip?.(w)) continue;
    for (const e of w.exercises) {
      if (e.type === 'time') continue;
      const sets = e.sets.filter((s) => !s.warm);
      if (!sets.length) continue;
      const list = out.get(e.key) || [];
      if (list.length < n) { list.push(sets); out.set(e.key, list); }
    }
  }
  return out;
}

// Jedna série (detail cviku): cíl nejtěžší série z posledního tréninku
export function nextTarget(last, spec, step) {
  return exerciseTargets(last ? [last] : [], { spec, step: step ?? defaultStep('') })[0] || null;
}

// Rekordy po trénincích (chronologicky). Počítá se jen překonání existujícího rekordu, ne první záznam cviku.
// e1RM jen ze sérií do 10 opakování; „reps“ = nejtěžší váha na daný počet opakování (1–12).
// → Map(workoutId → [{ key, name, kind: 'pb'|'e1'|'reps', weight, reps, time, e1 }]) – max. jeden záznam na cvik.
const E1_REC_MAX = 10, RM_MAX = 12;
export function recordsTimeline(workouts) {
  const out = new Map();
  const bestSet = new Map(), bestE1 = new Map(), rmOf = new Map();
  for (const w of [...workouts].sort((a, b) => a.startedAt - b.startedAt)) {
    const list = [];
    for (const e of w.exercises) {
      const sets = e.sets.filter((s) => !s.warm).map((s) => ({ weight: num(s.weight), reps: num(s.reps), time: num(s.time) }));
      const had = bestSet.has(e.key);
      let hit = null;
      // 1) klasický PB (váha, pak opakování; u času délka)
      let top = null;
      for (const s of sets) if (better(s, top)) top = s;
      if (top && better(top, bestSet.get(e.key))) {
        if (had) hit = { kind: 'pb', ...top };
        bestSet.set(e.key, top);
      }
      // 2) odhad 1RM (jen série do 10 opakování)
      const e1 = Math.max(0, ...sets.filter((s) => s.weight > 0 && !(s.time > 0) && s.reps > 0 && s.reps <= E1_REC_MAX).map((s) => e1rm(s.weight, s.reps)));
      if (e1 > 0) {
        const prev = bestE1.get(e.key);
        if (prev != null && e1 > prev + 0.05 && !hit) hit = { kind: 'e1', e1: Math.round(e1 * 10) / 10 };
        if (prev == null || e1 > prev) bestE1.set(e.key, e1);
      }
      // 3) rekord pro počet opakování: těžší váha na N opakování než kdykoli předtím
      const rm = rmOf.get(e.key) || [];
      const before = [...rm];
      for (const s of sets) {
        if (!(s.weight > 0) || s.time > 0 || !(s.reps > 0)) continue;
        const r = Math.min(s.reps, RM_MAX);
        if (s.reps <= RM_MAX && before[r] > 0 && s.weight > before[r] && !hit) hit = { kind: 'reps', weight: s.weight, reps: s.reps };
        for (let k = 1; k <= r; k++) if (!(rm[k] >= s.weight)) rm[k] = s.weight;
      }
      rmOf.set(e.key, rm);
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

// Návrh lehkého týdne (nikdy povinnost). Bell 2023 (Delphi): deload zhruba každé 4–6 týdnů na ~7 dní, plánovaně
// nebo podle únavy. Aplikace navrhuje až po 8 týdnech bez přestávky (aspoň 6 z nich se splněným cílem),
// nebo když výkon klesl u 2+ cviků ve 2 posledních trénincích (o víc než 5 % e1RM proti minulému tréninku cviku).
// → null | { reason: 'weeks', weeks } | { reason: 'drop', n }
export function deloadAdvice(workouts, { goal = 3, breaks = [], now = Date.now() } = {}) {
  const DAY = 864e5, WEEK = 7 * DAY;
  if (!workouts.length) return null;
  if (breaks.some((b) => b.from <= now && (b.to == null || b.to > now))) return null; // běží pauza / lehký týden
  const ws = [...workouts].filter((w) => w.startedAt <= now).sort((a, b) => a.startedAt - b.startedAt);
  const lastEnd = Math.max(ws[0].startedAt, ...breaks.map((b) => (b.to == null ? now : b.to)));
  const weeks = Math.floor((now - lastEnd) / WEEK);
  if (weeks >= 8) {
    let met = 0;
    for (let i = 0; i < weeks; i++) {
      const from = lastEnd + i * WEEK, to = from + WEEK;
      if (ws.filter((w) => w.startedAt >= from && w.startedAt < to).length >= goal) met++;
    }
    if (met >= 6) return { reason: 'weeks', weeks };
  }
  // Pokles výkonu: 2 poslední tréninky (do 10 dní), cviky srovnané s jejich předchozím tréninkem
  const last2 = ws.slice(-2);
  if (last2.length === 2 && now - last2[0].startedAt <= 10 * DAY) {
    const dropped = new Set();
    for (const w of last2) for (const e of w.exercises) {
      if (e.type === 'time') continue;
      const cur = bestE1(e.sets.filter((s) => num(s.reps) <= 12));
      if (!(cur > 0)) continue;
      const before = ws.filter((x) => x.startedAt < w.startedAt).reverse().find((x) => x.exercises.some((y) => y.key === e.key && y.sets.length));
      const prev = before ? bestE1(before.exercises.find((y) => y.key === e.key).sets.filter((s) => num(s.reps) <= 12)) : 0;
      if (prev > 0 && cur < prev * 0.95) dropped.add(e.key);
    }
    if (dropped.size >= 2) return { reason: 'drop', n: dropped.size };
  }
  return null;
}
