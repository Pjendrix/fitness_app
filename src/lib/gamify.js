// Forge Heat – tichá gamifikace. Vše se počítá z uložené historie, nic dalšího se neukládá
// (kromě volby síly „strengthScale“ v nastavení účtu).
//   heatInfo        žhnutí: každý trénink přitápí, každý den bez tréninku pomalu chladne
//   milestones      karty s úrovněmi I–V (objem, konzistence, Heat, síla vůči tělesné váze, progres, tajné)
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
};
export const SCALES = {
  standard: { bench: [0.5, 0.75, 1, 1.25, 1.5], squat: [0.75, 1, 1.5, 1.75, 2], deadlift: [1, 1.5, 2, 2.25, 2.5], ohp: [0.4, 0.5, 0.6, 0.75, 0.9], pullups: [1, 5, 10, 15, 20], total: [2, 2.5, 3, 4, 5] },
  lighter: { bench: [0.3, 0.45, 0.6, 0.8, 1], squat: [0.5, 0.75, 1, 1.25, 1.5], deadlift: [0.75, 1, 1.25, 1.5, 2], ohp: [0.25, 0.35, 0.45, 0.55, 0.65], pullups: [1, 3, 5, 8, 12], total: [1.25, 1.5, 2, 2.5, 3] },
};
export const TIERS = {
  workouts: [10, 50, 100, 250, 500],
  tonnage: [10, 50, 100, 500, 1000], // t
  streak: [2, 4, 12, 26, 52], // týdnů v řadě
  perfect: [1, 3, 6, 9, 12],
  balanced: [1, 3, 6, 9, 12],
  anniversary: [1, 2, 3, 4, 5],
  explorer: [10, 25, 50, 75, 100], // různých cviků
  steady: [30, 60, 90, 180, 365], // dní v kuse aspoň Warm
  forged: [7, 30, 90, 180, 365], // dní celkem White-hot
  rekindled: [1],
  prs: [1, 10, 25, 50, 100],
  hot: [3, 4, 5, 6, 8], // rekordů v jednom tréninku
  levelup: [10, 25, 50, 100, 200], // nová nejvyšší pracovní váha cviku
  growth: [10, 20, 30, 50, 100], // % e1RM oproti prvnímu zápisu
  fullweek: [1], yearround: [1], newyear: [1], triple: [1], // tajné
};
export const MILESTONE_GROUPS = [
  ['volume', ['workouts', 'tonnage', 'streak', 'perfect', 'balanced', 'explorer', 'anniversary']],
  ['heat', ['steady', 'forged', 'rekindled']],
  ['strength', ['bench', 'squat', 'deadlift', 'ohp', 'total', 'pullups']],
  ['progress', ['levelup', 'growth', 'prs', 'hot']],
  ['secret', ['fullweek', 'yearround', 'newyear', 'triple']],
];
export const SECRET = new Set(['fullweek', 'yearround', 'newyear', 'triple']);

const tierOf = (v, tiers) => tiers.filter((x) => v >= x - 1e-9).length;

// Nejlepší výkon cviku: { ratio vůči tělesné váze, kg, reps, time }
// + best = série, ze které se počítá poměr (pro detail milníku), bestReps = série s nejvíc opakováními
function liftBests(workouts, keys, body) {
  let ratio = 0, kg = 0, reps = 0, time = 0, bwAt = null, seen = false, best = null, bestReps = null, name = null;
  for (const w of workouts) for (const e of w.exercises) {
    if (!keys.includes(e.key)) continue;
    seen = true;
    name = e.name;
    for (const s of e.sets.filter(working)) {
      const wt = num(s.weight), r = num(s.reps), tm = num(s.time);
      if (tm > time) time = tm;
      if (r > reps) { reps = r; bestReps = { reps: r, date: w.startedAt }; }
      if (wt > 0 && r >= 1) {
        if (wt > kg) { kg = wt; if (!body.length) best = { kg: wt, reps: r, date: w.startedAt, bw: null }; }
        const bw = bodyAt(body, w.startedAt);
        if (bw && wt / bw > ratio) { ratio = wt / bw; bwAt = bw; best = { kg: wt, reps: r, date: w.startedAt, bw }; }
      }
    }
  }
  return { seen, ratio, kg, reps, time, bw: bwAt, best, bestReps, name };
}

// Heat na konci každého dne od prvního tréninku (inkrementálně: včerejšek × e^(−1/7) + dnešní tréninky)
export function dailyHeat(workouts, goal, now = Date.now()) {
  const ws = chrono(workouts.filter((w) => w.startedAt <= now));
  if (!ws.length) return [];
  const out = [];
  const decay = Math.exp(-DAY / HEAT_TAU);
  let s = 0, i = 0;
  for (let d = dayStart(ws[0].startedAt); d <= now; ) {
    const next = new Date(d); next.setDate(next.getDate() + 1);
    const end = Math.min(next.getTime(), now);
    s *= decay;
    for (; i < ws.length && ws[i].startedAt < next.getTime(); i++) s += Math.exp(-(end - ws[i].startedAt) / HEAT_TAU);
    out.push({ date: d, h: Math.min(100, Math.round((70 * s) / Math.max(1, goal))) });
    d = next.getTime();
  }
  return out;
}

// Pracovní váha cviku v tréninku (nejtěžší pracovní série s opakováním) → kolikrát nové maximum (bez prvního zápisu)
function levelUps(ws) {
  const best = new Map();
  let n = 0;
  for (const w of ws) for (const e of w.exercises) {
    if (e.type === 'time') continue;
    const top = Math.max(0, ...e.sets.filter((s) => working(s) && num(s.reps) >= 1).map((s) => num(s.weight)));
    if (!(top > 0)) continue;
    const prev = best.get(e.key);
    if (prev != null && top > prev) n++;
    if (prev == null || top > prev) best.set(e.key, top);
  }
  return n;
}
// Největší růst e1RM v % oproti prvnímu tréninku cviku (cvik aspoň 3×, první e1RM aspoň 20 kg)
function growthOf(ws) {
  const first = new Map(), best = new Map(), count = new Map(), names = new Map();
  for (const w of ws) for (const e of w.exercises) {
    if (e.type === 'time') continue;
    const v = Math.max(0, ...e.sets.filter((s) => working(s) && num(s.weight) > 0 && num(s.reps) > 0).map((s) => e1rm(num(s.weight), num(s.reps))));
    if (!(v > 0)) continue;
    if (!first.has(e.key)) first.set(e.key, v);
    best.set(e.key, Math.max(best.get(e.key) || 0, v));
    count.set(e.key, (count.get(e.key) || 0) + 1);
    names.set(e.key, e.name);
  }
  let top = { pct: 0, name: null };
  for (const [k, f] of first) {
    if (count.get(k) < 3 || f < 20) continue; // lehké doplňky (2 kg → 8 kg = +300 %) by výsledek zkreslily
    const pct = (best.get(k) / f - 1) * 100;
    if (pct > top.pct) top = { pct, name: names.get(k), from: Math.round(f * 10) / 10, to: Math.round(best.get(k) * 10) / 10 };
  }
  return top;
}

// → [{ id, group, tier, max, value, next, pct, secret?, ...extra }]; tier 0 = zatím nic, next null = maxed
// only: spočítat jen jeden milník (pro dohledání dat získání úrovní – volá se opakovaně)
export function milestones(workouts, { goal = 3, groups = [], body = [], scale = 'standard', now = Date.now(), only = null } = {}) {
  const ws = chrono(workouts.filter((w) => w.startedAt <= now));
  const sc = SCALES[scale] || SCALES.standard;
  const want = (...ids) => !only || ids.includes(only);
  const recs = want('prs', 'hot') ? recordsTimeline(ws) : new Map();
  const out = [];
  const push = (id, value, tiers, extra = {}) => {
    if (!want(id)) return;
    const tier = tierOf(value, tiers);
    const next = tier < tiers.length ? tiers[tier] : null;
    const prev = tier ? tiers[tier - 1] : 0;
    const pct = next == null ? 1 : Math.max(0, Math.min(1, (value - prev) / (next - prev)));
    out.push({ id, value, tier, max: tiers.length, next, pct, ...(SECRET.has(id) ? { secret: true } : {}), ...extra });
  };

  // Objem a konzistence
  push('workouts', ws.length, TIERS.workouts);
  push('tonnage', ws.reduce((s, w) => s + workoutVolume(w), 0) / 1000, TIERS.tonnage);
  push('streak', bestStreak(ws, goal, now), TIERS.streak);
  push('perfect', perfectMonths(ws, goal, now), TIERS.perfect);
  if (groups.some((g) => ws.some((w) => w.group === g))) push('balanced', balancedMonths(ws, groups, now), TIERS.balanced);
  push('explorer', new Set(ws.flatMap((w) => w.exercises.filter((e) => e.sets.length).map((e) => e.key))).size, TIERS.explorer);
  const first = ws[0]?.startedAt;
  const years = first ? Math.floor((now - first) / (365.25 * DAY)) : 0;
  push('anniversary', years, TIERS.anniversary, { first, nextDate: first ? new Date(first).setFullYear(new Date(first).getFullYear() + years + 1) : null });

  // Heat
  const days = want('steady', 'forged', 'rekindled') ? dailyHeat(ws, goal, now) : [];
  let run = 0, steady = 0, forged = 0, rekindled = 0, coldAt = null, warmedOnce = false;
  for (let i = 0; i < days.length; i++) {
    const h = days[i].h;
    if (h >= 25) { run++; steady = Math.max(steady, run); warmedOnce = true; } else run = 0;
    if (h >= 80) forged++;
    if (h < 25 && warmedOnce) coldAt = i;
    if (coldAt != null && h >= 50) { if (i - coldAt <= 7) rekindled++; coldAt = null; }
  }
  push('steady', steady, TIERS.steady, { current: run });
  push('forged', forged, TIERS.forged);
  push('rekindled', rekindled, TIERS.rekindled);

  // Síla vůči tělesné váze
  const latestBw = body.length ? [...body].sort((a, b) => b.date - a.date)[0].weight : null;
  const kgs = {};
  for (const id of ['bench', 'squat', 'deadlift', 'ohp']) {
    const b = liftBests(ws, LIFTS[id], body);
    kgs[id] = b.kg;
    const bw = b.bw || latestBw;
    const tiers = sc[id];
    const tier = tierOf(b.ratio, tiers);
    const next = tier < tiers.length ? tiers[tier] : null;
    push(id, b.ratio, tiers, { kg: b.kg, best: b.best, lift: b.name, bwNow: latestBw, needKg: next != null && bw ? Math.max(0, Math.ceil((next * bw - b.kg) / 2.5) * 2.5) : null, nobody: !body.length });
  }
  // Big three: součet nejlepších vah benche, dřepu a mrtvého tahu vůči aktuální tělesné váze
  const total = kgs.bench + kgs.squat + kgs.deadlift;
  const all3 = kgs.bench > 0 && kgs.squat > 0 && kgs.deadlift > 0;
  const tRatio = all3 && latestBw ? total / latestBw : 0;
  const tTier = tierOf(tRatio, sc.total);
  const tNext = tTier < sc.total.length ? sc.total[tTier] : null;
  push('total', tRatio, sc.total, { kg: total, lifts: { ...kgs }, bwNow: latestBw, missing: !all3, nobody: !body.length, needKg: tNext != null && latestBw && all3 ? Math.max(0, Math.ceil((tNext * latestBw - total) / 2.5) * 2.5) : null });
  const pu = liftBests(ws, LIFTS.pullups, body);
  push('pullups', pu.reps, sc.pullups, { best: pu.bestReps, lift: pu.name });

  // Progres a rekordy
  push('levelup', levelUps(ws), TIERS.levelup);
  const g = growthOf(ws);
  push('growth', g.pct, TIERS.growth, { lift: g.name, from: g.from, to: g.to });
  let prs = 0, hot = 0, hotW = null;
  for (const w of ws) { const n = (recs.get(w.id) || []).length; prs += n; if (n > hot) { hot = n; hotW = { name: w.name, date: w.startedAt }; } }
  push('prs', prs, TIERS.prs);
  push('hot', hot, TIERS.hot, { best: hotW });

  // Tajné (zobrazí se až po získání)
  const dows = new Set(ws.map((w) => new Date(w.startedAt).getDay()));
  push('fullweek', dows.size === 7 ? 1 : 0, TIERS.fullweek);
  const monthsByYear = new Map();
  for (const w of ws) { const d = new Date(w.startedAt); const y = d.getFullYear(); if (!monthsByYear.has(y)) monthsByYear.set(y, new Set()); monthsByYear.get(y).add(d.getMonth()); }
  push('yearround', [...monthsByYear.values()].some((s) => s.size === 12) ? 1 : 0, TIERS.yearround);
  push('newyear', ws.some((w) => { const d = new Date(w.startedAt); return d.getMonth() === 0 && d.getDate() === 1; }) ? 1 : 0, TIERS.newyear);
  const trainedDays = [...new Set(ws.map((w) => dayStart(w.startedAt)))].sort((a, b) => a - b);
  let triple = 0;
  for (let i = 2; i < trainedDays.length; i++) {
    const a = new Date(trainedDays[i - 2]); a.setDate(a.getDate() + 2);
    if (a.getTime() === trainedDays[i]) { triple = 1; break; }
  }
  push('triple', triple, TIERS.triple);

  const groupOf = Object.fromEntries(MILESTONE_GROUPS.flatMap(([gr, ids]) => ids.map((id) => [id, gr])));
  return out.map((m) => ({ ...m, group: groupOf[m.id] }));
}

// Kdy byla která úroveň milníku získána: binární hledání přes konce dní od prvního tréninku (hodnoty milníků
// v čase jen rostou). → [datum | null] pro každou úroveň. Počítá se až při otevření detailu.
export function tierDates(workouts, id, opts = {}) {
  const ws = chrono(workouts);
  if (!ws.length) return [];
  const now = opts.now ?? Date.now();
  const days = [];
  for (let d = new Date(dayStart(ws[0].startedAt)); d.getTime() <= now; d.setDate(d.getDate() + 1)) days.push(Math.min(now, d.getTime() + DAY - 1));
  const tierAt = (t) => milestones(ws, { ...opts, now: t, only: id })[0]?.tier || 0;
  const cur = tierAt(now);
  const out = [];
  for (let k = 1; k <= cur; k++) {
    let lo = 0, hi = days.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (tierAt(days[mid]) >= k) hi = mid; else lo = mid + 1; }
    out.push(dayStart(days[lo]));
  }
  return out;
}

// Nejbližší další úroveň (nejvyšší rozpracovanost, ne maxed; bez tělesné váhy / tajné / jednorázové se přeskočí)
export function closestMilestone(list) {
  return list
    .filter((m) => m.next != null && m.pct > 0 && m.pct < 1 && !m.nobody && !m.missing && !m.secret && m.max > 1 && m.id !== 'anniversary')
    .sort((a, b) => b.pct - a.pct)[0] || null;
}
export const milestoneTiers = (list) => list.filter((m) => !m.secret || m.tier).reduce((s, m) => s + m.tier, 0);
export const milestoneMax = (list) => list.filter((m) => !m.secret || m.tier).reduce((s, m) => s + m.max, 0);

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
  const top = open.map((s) => ({ id: s.id, weight: num(s.weight), reps: num(s.reps) })).sort((a, b) => b.weight - a.weight || b.reps - a.reps)[0];
  const hit = (h) => ({ ...h, setId: top.id }); // série, u které se tip ukáže
  // 1) PB (nejtěžší série): stejná váha, o 1–2 opakování víc
  if (pb && !(pb.time > 0) && num(pb.weight) > 0) {
    const pw = num(pb.weight), pr = num(pb.reps);
    if (top.weight > pw) return hit({ kind: 'pb', weight: top.weight, reps: 1 });
    if (top.weight === pw && pr + 1 - top.reps <= 2) return hit({ kind: 'pb', weight: pw, reps: pr + 1 });
  }
  if (!stat) return null;
  // 2) e1RM: o jedno opakování víc, nebo o jeden krok váhy
  if (stat.e1 > 0) {
    for (let r = top.reps; r <= Math.min(top.reps + 1, 12); r++) {
      if (e1rm(top.weight, r) > stat.e1 + 0.05) return hit({ kind: 'e1', weight: top.weight, reps: r });
    }
    if (e1rm(top.weight + step, top.reps) > stat.e1 + 0.05) return hit({ kind: 'e1', weight: top.weight + step, reps: top.reps, plus: step });
  }
  // 3) Nejvíc opakování s touto váhou
  const m = stat.repsAt.get(top.weight);
  if (m != null && top.reps >= m) return hit({ kind: 'reps', weight: top.weight, reps: m + 1 });
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
