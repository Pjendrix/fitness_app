// Forge Heat – tichá gamifikace. Vše se počítá z uložené historie, nic dalšího se neukládá
// (kromě volby síly „strengthScale“ v nastavení účtu).
//   heatInfo        žhnutí: každý trénink přitápí, každý den bez tréninku pomalu chladne
//   milestones      karty s úrovněmi I–V (objem, konzistence, síla vůči tělesné váze, rekordy, hravé)
//   weeklyFocus     max. 3 tichá doporučení na týden (generují se k pondělí, plní se během týdne)
//   monthRecap      měsíční kapitola (počty, rekordy, průběh Heatu, highlights)
//   liftStats / reachHint / setRecord   „Within reach“ v aktivním tréninku
import { e1rm } from './metrics.js';
import { recordsTimeline } from './progress.js';
import { bodyAt } from './body.js';
import { better, num, workoutVolume } from './util.js';

const DAY = 864e5;
export const ROMAN = ['—', 'I', 'II', 'III', 'IV', 'V'];
export const monday = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };
const nextMonday = (ms) => { const d = new Date(monday(ms)); d.setDate(d.getDate() + 7); return d.getTime(); };
const dayStart = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
export const monthStart = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); d.setDate(1); return d.getTime(); };
export const addMonths = (ms, n) => { const d = new Date(monthStart(ms)); d.setMonth(d.getMonth() + n); return d.getTime(); };
const working = (s) => !s.warm;
const chrono = (workouts) => [...workouts].sort((a, b) => a.startedAt - b.startedAt);

// ——— Heat ———
// Každý trénink přidá 1 a chladne exponenciálně (τ = 7 dní, poločas ≈ 4,9 dne).
// Průměrná hodnota při tempu přesně podle týdenního cíle g je g → škála 70·S/g:
// trénink podle cíle drží ~70 (Glowing), nad cílem stoupá k 100, týden pauzy spadne zhruba na třetinu.
export const HEAT_TAU = 7 * DAY;
export const HEAT_STATES = [
  { id: 'cold', min: 0 },
  { id: 'warm', min: 25 },
  { id: 'glow', min: 50 },
  { id: 'hot', min: 80 },
];
export const heatState = (h) => [...HEAT_STATES].reverse().find((s) => h >= s.min) || HEAT_STATES[0];

export function heatAt(workouts, goal, at = Date.now()) {
  let s = 0;
  for (const w of workouts) {
    const age = at - w.startedAt;
    if (age < 0 || age > 60 * DAY) continue;
    s += Math.exp(-age / HEAT_TAU);
  }
  return Math.min(100, Math.round((70 * s) / Math.max(1, goal)));
}

// Dny, za které Heat bez tréninku klesne pod hranici aktuálního stavu (null = Cold)
export function coolDays(heat) {
  const st = heatState(heat);
  if (st.id === 'cold' || heat <= 0) return null;
  return Math.max(1, Math.ceil((Math.log(heat / st.min) * HEAT_TAU) / DAY));
}

// Heat po dnech za posledních `days` dní (Ember bars): hodnota na konci dne (dnes = teď) + jestli se ten den trénovalo
export function heatInfo(workouts, goal, now = Date.now(), days = 28) {
  const heat = heatAt(workouts, goal, now);
  const today = dayStart(now);
  const trained = new Set(workouts.map((w) => dayStart(w.startedAt)));
  const bars = Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (days - 1 - i));
    const date = d.getTime();
    const at = i === days - 1 ? now : date + DAY - 1;
    return { date, h: heatAt(workouts, goal, at), on: trained.has(date) };
  });
  return { heat, state: heatState(heat).id, cool: coolDays(heat), bars };
}

// ——— Týdny a série ———
function weekCounts(workouts) {
  const m = new Map();
  for (const w of workouts) { const k = monday(w.startedAt); m.set(k, (m.get(k) || 0) + 1); }
  return m;
}
// Nejdelší série týdnů se splněným cílem (rozběhnutý týden se počítá, jen když je už splněný)
export function bestStreak(workouts, goal, now = Date.now()) {
  if (!workouts.length) return 0;
  const counts = weekCounts(workouts);
  const first = monday(Math.min(...workouts.map((w) => w.startedAt)));
  let best = 0, run = 0;
  for (let m = first; m <= now; m = nextMonday(m)) {
    if ((counts.get(m) || 0) >= goal) { run++; best = Math.max(best, run); } else if (m !== monday(now)) run = 0;
  }
  return best;
}

// Dokončené kalendářní měsíce od prvního tréninku
function completedMonths(workouts, now) {
  if (!workouts.length) return [];
  const out = [];
  for (let m = monthStart(Math.min(...workouts.map((w) => w.startedAt))); addMonths(m, 1) <= now; m = addMonths(m, 1)) out.push(m);
  return out;
}
const mondaysIn = (m, until = Infinity) => {
  const out = [];
  const end = addMonths(m, 1);
  for (let d = new Date(m); d.getTime() < end; d.setDate(d.getDate() + 1)) if (d.getDay() === 1 && d.getTime() < until) out.push(d.getTime());
  return out;
};
// Měsíc, kdy byl cíl splněný každý týden (týden patří měsíci podle svého pondělí)
export function perfectMonths(workouts, goal, now = Date.now()) {
  const counts = weekCounts(workouts);
  return completedMonths(workouts, now).filter((m) => mondaysIn(m).every((d) => (counts.get(d) || 0) >= goal)).length;
}
// Měsíc, kdy žádná skupina splitu nevypadla na víc než `gap` dní (skupiny bez jediného tréninku se nepočítají)
export function balancedMonths(workouts, groups, now = Date.now(), gap = 10) {
  const ids = groups.filter((g) => workouts.some((w) => w.group === g));
  if (!ids.length) return 0;
  return completedMonths(workouts, now).filter((m) => {
    const end = addMonths(m, 1);
    return ids.every((g) => {
      const days = workouts.filter((w) => w.group === g && w.startedAt >= m && w.startedAt < end).map((w) => w.startedAt).sort((a, b) => a - b);
      if (!days.length) return false;
      let prev = m;
      for (const d of [...days, end]) { if (d - prev > gap * DAY) return false; prev = d; }
      return true;
    });
  }).length;
}

// ——— Milestones ———
// Síla vůči tělesné váze: dvě škály (Nastavení → Strength scale). Lighter posune hranice níž.
export const LIFTS = {
  bench: ['bench-press-barbell', 'bench-press'],
  squat: ['squat', 'back-squat', 'squat-barbell'],
  deadlift: ['deadlift', 'deadlift-barbell', 'conventional-deadlift'],
  ohp: ['military-press', 'overhead-press', 'overhead-press-barbell', 'ohp'],
  pullups: ['pull-up', 'chin-up', 'pullup', 'pull-ups', 'chin-ups', 'weighted-pull-up'],
  plank: ['plank'],
  stair: ['stairmaster', 'stair-climber'],
};
export const SCALES = {
  standard: { bench: [0.5, 0.75, 1, 1.25, 1.5], squat: [0.75, 1, 1.5, 1.75, 2], deadlift: [1, 1.5, 2, 2.25, 2.5], ohp: [0.4, 0.5, 0.6, 0.75, 0.9], pullups: [1, 5, 10, 15, 20] },
  lighter: { bench: [0.3, 0.45, 0.6, 0.8, 1], squat: [0.5, 0.75, 1, 1.25, 1.5], deadlift: [0.75, 1, 1.25, 1.5, 2], ohp: [0.25, 0.35, 0.45, 0.55, 0.65], pullups: [1, 3, 5, 8, 12] },
};
export const TIERS = {
  workouts: [10, 50, 100, 250, 500],
  tonnage: [10, 50, 100, 500, 1000], // t
  streak: [2, 4, 12, 26, 52], // týdnů v řadě
  perfect: [1, 3, 6, 9, 12],
  balanced: [1, 3, 6, 9, 12],
  comeback: [1],
  anniversary: [1, 2, 3, 4, 5],
  prs: [1, 10, 25, 50, 100],
  hot: [3, 4, 5, 6, 8], // rekordů v jednom tréninku
  sweep: [1, 3, 5, 10, 20],
  early: [5, 10, 25, 50, 100],
  night: [5, 10, 25, 50, 100],
  plank: [1, 1.5, 2, 3, 5], // min
  stair: [10, 20, 30, 45, 60], // min v jednom tréninku
};
export const MILESTONE_GROUPS = [
  ['volume', ['workouts', 'tonnage', 'streak', 'perfect', 'balanced', 'comeback', 'anniversary']],
  ['strength', ['bench', 'squat', 'deadlift', 'ohp', 'pullups']],
  ['records', ['prs', 'hot', 'sweep']],
  ['fun', ['early', 'night', 'plank', 'stair']],
];

const tierOf = (v, tiers) => tiers.filter((x) => v >= x - 1e-9).length;

// Nejlepší výkon cviku: { load: max váha (pracovní série s opakováním), reps: max opakování, time: max min, date }
function liftBests(workouts, keys, body) {
  let ratio = 0, kg = 0, reps = 0, time = 0, bwAt = null, seen = false;
  for (const w of workouts) for (const e of w.exercises) {
    if (!keys.includes(e.key)) continue;
    seen = true;
    for (const s of e.sets.filter(working)) {
      const wt = num(s.weight), r = num(s.reps), tm = num(s.time);
      if (tm > time) time = tm;
      if (r > reps) reps = r;
      if (wt > 0 && r >= 1) {
        if (wt > kg) kg = wt;
        const bw = bodyAt(body, w.startedAt);
        if (bw && wt / bw > ratio) { ratio = wt / bw; bwAt = bw; }
      }
    }
  }
  return { seen, ratio, kg, reps, time, bw: bwAt };
}

// → [{ id, group, tier, max, value, next, pct, ...extra }]; tier 0 = zatím nic, next null = maxed
export function milestones(workouts, { goal = 3, groups = [], body = [], scale = 'standard', now = Date.now() } = {}) {
  const ws = chrono(workouts.filter((w) => w.startedAt <= now));
  const sc = SCALES[scale] || SCALES.standard;
  const recs = recordsTimeline(ws);
  const val = {};
  val.workouts = ws.length;
  val.tonnage = ws.reduce((s, w) => s + workoutVolume(w), 0) / 1000;
  val.streak = bestStreak(ws, goal, now);
  val.perfect = perfectMonths(ws, goal, now);
  val.balanced = balancedMonths(ws, groups, now);
  let gaps = 0;
  for (let i = 1; i < ws.length; i++) if (ws[i].startedAt - ws[i - 1].startedAt >= 14 * DAY) gaps++;
  val.comeback = gaps;
  const first = ws[0]?.startedAt;
  val.anniversary = first ? Math.floor((now - first) / (365.25 * DAY)) : 0;
  let prs = 0, hot = 0, sweep = 0;
  for (const w of ws) {
    const list = recs.get(w.id) || [];
    prs += list.length;
    hot = Math.max(hot, list.length);
    const exs = w.exercises.filter((e) => e.sets.length);
    if (exs.length >= 3 && exs.every((e) => list.some((r) => r.key === e.key))) sweep++;
  }
  Object.assign(val, { prs, hot, sweep });
  val.early = ws.filter((w) => new Date(w.startedAt).getHours() < 7).length;
  val.night = ws.filter((w) => new Date(w.startedAt).getHours() >= 21).length;

  const out = [];
  const push = (id, value, tiers, extra = {}) => {
    const tier = tierOf(value, tiers);
    const next = tier < tiers.length ? tiers[tier] : null;
    const prev = tier ? tiers[tier - 1] : 0;
    const pct = next == null ? 1 : Math.max(0, Math.min(1, (value - prev) / (next - prev)));
    out.push({ id, value, tier, max: tiers.length, next, pct, ...extra });
  };
  for (const id of ['workouts', 'tonnage', 'streak', 'perfect']) push(id, val[id], TIERS[id]);
  if (groups.length > 1 || groups.some((g) => ws.some((w) => w.group === g))) push('balanced', val.balanced, TIERS.balanced);
  push('comeback', val.comeback, TIERS.comeback);
  push('anniversary', val.anniversary, TIERS.anniversary, { first, nextDate: first ? new Date(first).setFullYear(new Date(first).getFullYear() + val.anniversary + 1) : null });
  for (const id of ['bench', 'squat', 'deadlift', 'ohp']) {
    const b = liftBests(ws, LIFTS[id], body);
    const bw = b.bw || body[0]?.weight || null;
    const tiers = sc[id];
    const tier = tierOf(b.ratio, tiers);
    const next = tier < tiers.length ? tiers[tier] : null;
    push(id, b.ratio, tiers, { kg: b.kg, bw, needKg: next != null && bw ? Math.max(0, Math.ceil((next * bw - b.kg) / 2.5) * 2.5) : null, nobody: !body.length });
  }
  const pu = liftBests(ws, LIFTS.pullups, body);
  push('pullups', pu.reps, sc.pullups);
  for (const id of ['prs', 'hot', 'sweep', 'early', 'night']) push(id, val[id], TIERS[id]);
  const plank = liftBests(ws, LIFTS.plank, body);
  if (plank.seen) push('plank', plank.time, TIERS.plank);
  // Stairmaster: nejdelší čas v jednom tréninku (součet sérií)
  let stair = 0, stairSeen = false;
  for (const w of ws) {
    let m = 0;
    for (const e of w.exercises) if (LIFTS.stair.includes(e.key)) { stairSeen = true; m += e.sets.filter(working).reduce((s, x) => s + num(x.time), 0); }
    stair = Math.max(stair, m);
  }
  if (stairSeen) push('stair', stair, TIERS.stair);
  const groupOf = Object.fromEntries(MILESTONE_GROUPS.flatMap(([g, ids]) => ids.map((id) => [id, g])));
  return out.map((m) => ({ ...m, group: groupOf[m.id] }));
}

// Nejbližší další úroveň (nejvyšší rozpracovanost, ne maxed; síla bez tělesné váhy se přeskočí)
export function closestMilestone(list) {
  return list
    .filter((m) => m.next != null && m.pct > 0 && m.pct < 1 && !m.nobody && m.id !== 'anniversary' && m.id !== 'comeback')
    .sort((a, b) => b.pct - a.pct)[0] || null;
}
export const milestoneTiers = (list) => list.reduce((s, m) => s + m.tier, 0);
export const milestoneMax = (list) => list.reduce((s, m) => s + m.max, 0);

// ——— Weekly focus ———
// Položky se volí podle stavu k pondělí (během týdne se nemění), splnění se počítá z tohoto týdne.
// → [{ id, kind: 'lag'|'record'|'body'|'goal', done, ...params }]
export function weeklyFocus(workouts, { goal = 3, groups = [], body = [], now = Date.now() } = {}) {
  const mon = monday(now);
  const before = workouts.filter((w) => w.startedAt < mon);
  const week = workouts.filter((w) => w.startedAt >= mon && w.startedAt <= now);
  const items = [];

  // 1) Zaostávající skupina (≥ 6 dní bez tréninku k pondělí)
  let lag = null;
  for (const g of groups) {
    const last = Math.max(0, ...before.filter((w) => w.group === g).map((w) => w.startedAt));
    if (!last) continue;
    const days = Math.floor((mon - last) / DAY);
    if (days >= 6 && (!lag || days > lag.days)) lag = { group: g, days, last };
  }
  if (lag) {
    const done = week.some((w) => w.group === lag.group);
    items.push({ id: 'lag', kind: 'lag', group: lag.group, days: Math.floor((now - lag.last) / DAY), done });
  }

  // 2) Rekord na nejdosažitelnějším cviku (≥ 2× za poslední 4 týdny, poslední e1RM nejblíž rekordu)
  const recent = before.filter((w) => w.startedAt >= mon - 28 * DAY);
  const freq = new Map();
  for (const w of recent) for (const e of w.exercises) if (e.type !== 'time' && e.sets.some((s) => num(s.weight) > 0)) freq.set(e.key, (freq.get(e.key) || 0) + 1);
  const stats = liftStats(before);
  let pick = null;
  for (const [key, n] of freq) {
    if (n < 2) continue;
    const st = stats.get(key);
    if (!st?.e1) continue;
    const lastW = recent.filter((w) => w.exercises.some((e) => e.key === key)).sort((a, b) => b.startedAt - a.startedAt)[0];
    const ex = lastW.exercises.find((e) => e.key === key);
    const lastE1 = Math.max(0, ...ex.sets.filter(working).map((s) => (num(s.weight) > 0 ? e1rm(num(s.weight), num(s.reps)) : 0)));
    const ratio = lastE1 / st.e1;
    if (!pick || ratio > pick.ratio || (ratio === pick.ratio && n > pick.n)) pick = { key, name: ex.name, e1: Math.round(st.e1 * 10) / 10, ratio, n };
  }
  if (pick) {
    const recs = recordsTimeline(workouts.filter((w) => w.startedAt <= now));
    const done = week.some((w) => (recs.get(w.id) || []).some((r) => r.key === pick.key));
    items.push({ id: 'record', kind: 'record', key: pick.key, name: pick.name, e1: pick.e1, done });
  }

  // 3) Tělesná váha, pokud ji účet loguje a poslední týden chybí
  const logs = body.length > 0;
  const loggedBefore = body.some((b) => b.date >= mon - 7 * DAY && b.date < mon);
  if (logs && !loggedBefore) items.push({ id: 'body', kind: 'body', done: body.some((b) => b.date >= mon && b.date <= now + DAY) });

  // Doplnit týdenním cílem
  if (items.length < 3) items.push({ id: 'goal', kind: 'goal', goal, count: week.length, done: week.length >= goal });
  return items.slice(0, 3);
}

// ——— Within reach (aktivní trénink) ———
// Map(key → { e1, repsAt: Map(váha → max opakování) }) z dokončených tréninků
export function liftStats(workouts) {
  const out = new Map();
  for (const w of workouts) for (const e of w.exercises) {
    if (e.type === 'time') continue;
    let st = out.get(e.key);
    for (const s of e.sets) {
      if (s.warm) continue;
      const wt = num(s.weight), r = num(s.reps);
      if (!(wt > 0) || !(r > 0) || num(s.time) > 0) continue;
      if (!st) { st = { e1: 0, repsAt: new Map() }; out.set(e.key, st); }
      st.e1 = Math.max(st.e1, e1rm(wt, r));
      if (!(st.repsAt.get(wt) >= r)) st.repsAt.set(wt, r);
    }
  }
  return out;
}

// Nejmenší krok k novému rekordu podle naplánované nejtěžší série (předvyplněné hodnoty).
// → { kind: 'pb'|'e1'|'reps', weight, reps, plus? } nebo null
export function reachHint(ex, pb, stat, step = 2.5) {
  if (!ex || ex.type === 'time') return null;
  const open = ex.sets.filter((s) => !s.warm && !s.done && num(s.weight) > 0 && num(s.reps) > 0);
  if (!open.length) return null;
  const top = open.map((s) => ({ weight: num(s.weight), reps: num(s.reps) })).sort((a, b) => b.weight - a.weight || b.reps - a.reps)[0];
  // 1) PB (nejtěžší série): stejná váha, o 1–2 opakování víc
  if (pb && !(pb.time > 0) && num(pb.weight) > 0) {
    const pw = num(pb.weight), pr = num(pb.reps);
    if (top.weight > pw) return { kind: 'pb', weight: top.weight, reps: 1 };
    if (top.weight === pw && pr + 1 - top.reps <= 2) return { kind: 'pb', weight: pw, reps: pr + 1 };
  }
  if (!stat) return null;
  // 2) e1RM: o jedno opakování víc, nebo o jeden krok váhy
  if (stat.e1 > 0) {
    for (let r = top.reps; r <= Math.min(top.reps + 1, 12); r++) {
      if (e1rm(top.weight, r) > stat.e1 + 0.05) return { kind: 'e1', weight: top.weight, reps: r };
    }
    if (e1rm(top.weight + step, top.reps) > stat.e1 + 0.05) return { kind: 'e1', weight: top.weight + step, reps: top.reps, plus: step };
  }
  // 3) Nejvíc opakování s touto váhou
  const m = stat.repsAt.get(top.weight);
  if (m != null && top.reps >= m) return { kind: 'reps', weight: top.weight, reps: m + 1 };
  return null;
}

// Druh rekordu, který odškrtnutá série překonala (vůči historii), nebo null
export function setRecord(set, pb, stat, timed = false) {
  if (!set || set.warm) return null;
  const wt = num(set.weight), r = num(set.reps), tm = num(set.time);
  if (pb && better({ weight: wt, reps: timed ? 0 : r, time: timed ? tm : 0 }, pb)) return 'pb';
  if (timed || !(wt > 0) || !(r > 0) || !stat) return null;
  if (stat.e1 > 0 && e1rm(wt, r) > stat.e1 + 0.05) return 'e1';
  const m = stat.repsAt.get(wt);
  if (m != null && r > m) return 'reps';
  return null;
}

// ——— Monthly recap ———
export function monthRecap(workouts, { month, goal = 3, groups = [], body = [], scale = 'standard' } = {}) {
  const start = monthStart(month), end = addMonths(start, 1);
  const ws = chrono(workouts.filter((w) => w.startedAt >= start && w.startedAt < end));
  const recs = recordsTimeline(workouts.filter((w) => w.startedAt < end));
  const records = ws.reduce((n, w) => n + (recs.get(w.id) || []).length, 0);
  const counts = weekCounts(workouts);
  const mons = mondaysIn(start, Math.min(end, Date.now()));
  const weeksMet = mons.filter((d) => (counts.get(d) || 0) >= goal).length;
  const days = [];
  for (let d = new Date(start); d.getTime() < end; d.setDate(d.getDate() + 1)) {
    const at = d.getTime() + DAY - 1;
    days.push(at > Date.now() ? null : heatAt(workouts, goal, at));
  }
  // Nejlepší zvednutí měsíce (nejvyšší e1RM série)
  let best = null;
  for (const w of ws) for (const e of w.exercises) for (const s of e.sets) {
    if (s.warm || e.type === 'time') continue;
    const wt = num(s.weight), r = num(s.reps);
    if (!(wt > 0) || !(r > 0)) continue;
    const v = e1rm(wt, r);
    if (!best || v > best.e1) best = { name: e.name, weight: wt, reps: r, e1: v };
  }
  // Největší skok: nejlepší e1RM v měsíci vs. nejlepší před ním
  const pre = liftStats(workouts.filter((w) => w.startedAt < start));
  const cur = liftStats(ws);
  let jump = null;
  for (const [key, st] of cur) {
    const p = pre.get(key);
    if (!p?.e1) continue;
    const d = st.e1 - p.e1;
    if (d > 0.5 && (!jump || d > jump.delta)) {
      const name = ws.flatMap((w) => w.exercises).find((e) => e.key === key)?.name || key;
      jump = { name, delta: Math.round(d * 10) / 10 };
    }
  }
  // Nejčastější skupina
  const gc = new Map();
  for (const w of ws) if (w.group) gc.set(w.group, (gc.get(w.group) || 0) + 1);
  const top = [...gc].sort((a, b) => b[1] - a[1])[0];
  // Nové úrovně Milestones za měsíc
  const opts = { goal, groups, body, scale };
  const a = milestones(workouts, { ...opts, now: start - 1 }), b = milestones(workouts, { ...opts, now: end - 1 });
  const gained = b.filter((m) => m.tier > (a.find((x) => x.id === m.id)?.tier || 0)).map((m) => ({ id: m.id, tier: m.tier }));
  return {
    month: start, workouts: ws.length, records, weeksMet, weeks: mons.length, heat: days,
    best, jump, topGroup: top ? { group: top[0], n: top[1] } : null, gained,
    volume: ws.reduce((s, w) => s + workoutVolume(w), 0),
  };
}
