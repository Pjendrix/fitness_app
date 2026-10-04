// Forge Heat – tichá gamifikace. Vše se počítá z uložené historie, nic dalšího se neukládá
// (kromě nastavení účtu: strengthScale, breaks = pauzy a lehké týdny).
//   heatInfo        žhnutí: pravidelnost podle VLASTNÍHO týdenního cíle – trénink nad cíl Heat nezvyšuje
//   weekStatuses    týdny: splněno / lehký týden / pauza / joker / nesplněno → série a perfektní měsíce
//   milestones      karty s úrovněmi I–V (objem, konzistence, Heat, síla vůči sobě, progres, tajné)
//   monthRecap      měsíční kapitola (počty, rekordy, průběh Heatu, highlights)
//   liftStats / reachHint / setRecord   „Rekord na dosah“ v aktivním tréninku
import { e1rm } from './metrics.js';
import { isCompound, recordsTimeline } from './progress.js';
import { bodyAt } from './body.js';
import { better, num, workoutVolume } from './util.js';
import { effTime, weekExcuse } from './breaks.js';

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
// Heat měří pravidelnost vůči vlastnímu týdennímu cíli, ne objem:
//  • max. 1 trénink za den a max. `goal` tréninků za týden (víc tréninků Heat nezvedá)
//  • návrat po ≥ 7 dnech bez tréninku přitopí dvojnásob (odměna za návrat – Milkman 2021: +27 % návštěv)
//  • během pauzy (nemoc, dovolená) čas stojí – Heat nechladne
// Každá jednotka chladne exponenciálně (τ = 7 dní). Tempo přesně podle cíle drží Heat kolem 80–100 (White-hot / Glowing),
// jeden vynechaný týden ho sníží zhruba na třetinu.
export const HEAT_TAU = 7 * DAY;
export const COMEBACK_DAYS = 7;
export const HEAT_STATES = [
  { id: 'cold', min: 0 },
  { id: 'warm', min: 25 },
  { id: 'glow', min: 50 },
  { id: 'hot', min: 80 },
];
export const heatState = (h) => [...HEAT_STATES].reverse().find((s) => h >= s.min) || HEAT_STATES[0];

// Jednotky Heatu: [{ t, u, back }] chronologicky (u = 0 → nad cíl, nepočítá se)
export function heatUnits(workouts, goal, breaks = []) {
  const eff = effTime(breaks);
  const out = [];
  const days = new Set(), perWeek = new Map();
  let lastT = null;
  for (const w of chrono(workouts)) {
    const d = dayStart(w.startedAt);
    if (days.has(d)) continue;
    days.add(d);
    const back = lastT != null && eff(w.startedAt) - eff(lastT) >= COMEBACK_DAYS * DAY;
    lastT = w.startedAt;
    const m = monday(w.startedAt), n = perWeek.get(m) || 0;
    perWeek.set(m, n + 1);
    const u = n >= Math.max(1, goal) ? (back ? 1 : 0) : back ? 2 : 1;
    out.push({ t: w.startedAt, u, back });
  }
  return out;
}
const heatFromUnits = (units, goal, breaks, at) => {
  const eff = effTime(breaks, at);
  const now = eff(at);
  let s = 0;
  for (const x of units) {
    if (!x.u || x.t > at) continue;
    const age = now - eff(x.t);
    if (age > 60 * DAY) continue;
    s += x.u * Math.exp(-age / HEAT_TAU);
  }
  return Math.min(100, Math.round((100 * s) / Math.max(1, goal)));
};
export function heatAt(workouts, goal, at = Date.now(), breaks = []) {
  return heatFromUnits(heatUnits(workouts, goal, breaks), goal, breaks, at);
}

// Heat po dnech za posledních `days` dní (Ember bars): hodnota na konci dne (dnes = teď) + jestli se ten den trénovalo
export function heatInfo(workouts, goal, now = Date.now(), days = 28, breaks = []) {
  const units = heatUnits(workouts, goal, breaks);
  const heat = heatFromUnits(units, goal, breaks, now);
  const today = dayStart(now);
  const trained = new Set(workouts.map((w) => dayStart(w.startedAt)));
  const bars = Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (days - 1 - i));
    const date = d.getTime();
    const at = i === days - 1 ? now : date + DAY - 1;
    return { date, h: heatFromUnits(units, goal, breaks, at), on: trained.has(date) };
  });
  return { heat, state: heatState(heat).id, bars };
}

// Heat na konci každého dne od prvního tréninku
export function dailyHeat(workouts, goal, now = Date.now(), breaks = []) {
  const ws = chrono(workouts.filter((w) => w.startedAt <= now));
  if (!ws.length) return [];
  const units = heatUnits(ws, goal, breaks);
  const out = [];
  for (let d = dayStart(ws[0].startedAt); d <= now; ) {
    const next = new Date(d); next.setDate(next.getDate() + 1);
    const end = Math.min(next.getTime() - 1, now);
    out.push({ date: d, h: heatFromUnits(units, goal, breaks, end) });
    d = next.getTime();
  }
  return out;
}

// ——— Týdny a série ———
// Stav každého týdne od prvního tréninku:
//   met     cíl splněný
//   deload  lehký týden (počítá se jako splněný)
//   pause   pauza ≥ 3 dny (série stojí – nepřibývá, nepřeruší se)
//   joker   jeden nesplněný týden za 4 týdny se odpustí automaticky (série stojí)
//   miss    nesplněno → série končí
//   open    probíhající týden, zatím nesplněný
export const JOKER_EVERY = 4;
export const KEPT = new Set(['met', 'deload', 'pause', 'joker']);
function weekCounts(workouts) {
  const m = new Map();
  for (const w of workouts) { const k = monday(w.startedAt); m.set(k, (m.get(k) || 0) + 1); }
  return m;
}
export function weekStatuses(workouts, goal, breaks = [], now = Date.now()) {
  if (!workouts.length) return [];
  const counts = weekCounts(workouts);
  const first = monday(Math.min(...workouts.map((w) => w.startedAt)));
  const cur = monday(now);
  const out = [];
  let lastJoker = -Infinity;
  for (let m = first, i = 0; m <= cur; m = nextMonday(m), i++) {
    const n = counts.get(m) || 0;
    let status;
    if (n >= goal) status = 'met';
    else {
      const ex = weekExcuse(breaks, m, now);
      if (ex) status = ex;
      else if (m === cur) status = 'open';
      else if (i - lastJoker >= JOKER_EVERY) { status = 'joker'; lastJoker = i; }
      else status = 'miss';
    }
    out.push({ mon: m, n, status });
  }
  return out;
}
// Série: splněné týdny (a lehké) přičítají, pauza a joker sérii drží, nesplněný týden ji ukončí
export function streaks(statuses) {
  let run = 0, best = 0;
  for (const w of statuses) {
    if (w.status === 'met' || w.status === 'deload') { run++; best = Math.max(best, run); } else if (w.status === 'miss') run = 0;
  }
  return { current: run, best };
}
export function bestStreak(workouts, goal, now = Date.now(), breaks = []) {
  return streaks(weekStatuses(workouts, goal, breaks, now)).best;
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
// Měsíc „podle plánu“: žádný nesplněný týden (lehký týden, pauza i joker se počítají) a aspoň jeden splněný
export function perfectMonths(workouts, goal, now = Date.now(), breaks = []) {
  const st = new Map(weekStatuses(workouts, goal, breaks, now).map((w) => [w.mon, w.status]));
  return completedMonths(workouts, now).filter((m) => {
    const list = mondaysIn(m).map((d) => st.get(d) || 'miss');
    return list.every((s) => KEPT.has(s)) && list.some((s) => s === 'met');
  }).length;
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
// Síla: výchozí je pokrok VŮČI SOBĚ na cvicích, které opravdu děláš (lift:<key>).
// Poměr k tělesné váze je jen volitelný orientační benchmark (Nastavení), zvlášť pro muže a ženy:
// počítá se z odhadu 1RM (série do 10 opakování) a z průměrné tělesné váhy za 90 dní – hubnutí tedy stupeň neposune.
export const LIFTS = {
  bench: ['bench-press-barbell', 'bench-press'],
  squat: ['squat', 'back-squat', 'squat-barbell'],
  deadlift: ['deadlift', 'deadlift-barbell', 'conventional-deadlift'],
  ohp: ['military-press', 'overhead-press', 'overhead-press-barbell', 'ohp'],
  pullups: ['pull-up', 'chin-up', 'pullup', 'pull-ups', 'chin-ups', 'weighted-pull-up'],
};
export const SCALE_IDS = ['self', 'men', 'women'];
export const normScale = (v) => (SCALE_IDS.includes(v) ? v : 'self'); // starší 'standard' / 'lighter' → vůči sobě
// Ženy ~25–30 % níž (relativní síla soutěžních powerlifterek vs. powerlifterů, JSAMS 2024) – orientační, ne norma.
export const SCALES = {
  men: { bench: [0.5, 0.75, 1, 1.25, 1.5], squat: [0.75, 1, 1.5, 1.75, 2], deadlift: [1, 1.5, 2, 2.25, 2.5], ohp: [0.4, 0.5, 0.6, 0.75, 0.9], pullups: [1, 5, 10, 15, 20], total: [2, 2.5, 3, 4, 5] },
  women: { bench: [0.35, 0.5, 0.65, 0.85, 1.05], squat: [0.5, 0.75, 1, 1.25, 1.5], deadlift: [0.75, 1, 1.25, 1.6, 1.9], ohp: [0.25, 0.35, 0.45, 0.55, 0.65], pullups: [1, 3, 5, 8, 12], total: [1.5, 2, 2.5, 3, 3.6] },
};
export const LIFT_TIERS = [10, 25, 50, 75, 100]; // % e1RM oproti prvnímu tréninku cviku
export const MAX_SELF_LIFTS = 4;
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
  rekindled: [1, 3, 5, 10, 15], // návraty po ≥ 7 dnech bez tréninku
  prs: [1, 10, 25, 50, 100],
  levelup: [10, 25, 50, 100, 200], // nová nejvyšší pracovní váha cviku
  growth: [10, 20, 30, 50, 100], // % e1RM oproti prvnímu zápisu
  fullweek: [1], yearround: [1], newyear: [1], // tajné
};
export const MILESTONE_GROUPS = [
  ['volume', ['workouts', 'tonnage', 'streak', 'perfect', 'balanced', 'explorer', 'anniversary']],
  ['heat', ['steady', 'forged', 'rekindled']],
  ['strength', ['lift', 'bench', 'squat', 'deadlift', 'ohp', 'total', 'pullups']],
  ['progress', ['levelup', 'growth', 'prs']],
  ['secret', ['fullweek', 'yearround', 'newyear']],
];
export const SECRET = new Set(['fullweek', 'yearround', 'newyear']);
export const isLiftId = (id) => typeof id === 'string' && id.startsWith('lift:');
export const baseId = (id) => (isLiftId(id) ? 'lift' : id);

const tierOf = (v, tiers) => tiers.filter((x) => v >= x - 1e-9).length;
const E1_MAX = 10;
const bestE1Of = (sets) => Math.max(0, ...sets.filter((s) => working(s) && num(s.weight) > 0 && num(s.reps) > 0 && num(s.reps) <= E1_MAX && !(num(s.time) > 0)).map((s) => e1rm(num(s.weight), num(s.reps))));
// Průměrná tělesná váha za 90 dní do okamžiku t (jinak poslední známá)
export function bodyAvg(body, t, days = 90) {
  const list = body.filter((b) => b.date <= t + DAY / 2 && b.date > t - days * DAY);
  if (!list.length) return bodyAt(body, t);
  return list.reduce((s, b) => s + b.weight, 0) / list.length;
}

// Nejlepší odhad 1RM cviku vůči tělesné váze: { ratio, e1, best, name, seen }
function liftBests(workouts, keys, body) {
  let ratio = 0, e1 = 0, bwAt = null, best = null, name = null, seen = false;
  for (const w of workouts) for (const e of w.exercises) {
    if (!keys.includes(e.key)) continue;
    seen = true; name = e.name;
    for (const s of e.sets.filter(working)) {
      const wt = num(s.weight), r = num(s.reps);
      if (!(wt > 0) || !(r >= 1) || r > E1_MAX) continue;
      const v = e1rm(wt, r);
      if (v > e1) { e1 = v; if (!body.length) best = { kg: wt, reps: r, e1: v, date: w.startedAt, bw: null }; }
      const bw = body.length ? bodyAvg(body, w.startedAt) : null;
      if (bw && v / bw > ratio) { ratio = v / bw; bwAt = bw; best = { kg: wt, reps: r, e1: v, date: w.startedAt, bw }; }
    }
  }
  return { seen, ratio, e1, bw: bwAt, best, name };
}
function pullupBests(workouts) {
  let reps = 0, best = null, name = null;
  for (const w of workouts) for (const e of w.exercises) {
    if (!LIFTS.pullups.includes(e.key)) continue;
    name = e.name;
    for (const s of e.sets.filter(working)) if (num(s.reps) > reps) { reps = num(s.reps); best = { reps, date: w.startedAt }; }
  }
  return { reps, best, name };
}

// Síla vůči sobě: posun nejlepšího e1RM cviku oproti prvnímu tréninku (počítá se od 3. tréninku).
// Cviky: vlastní výběr (Nastavení síly, max. 4), jinak automaticky jen VÍCEKLOUBOVÉ cviky – nejdřív big three
// (bench, dřep, mrtvý tah), pak nejčastější za posledních 120 dní (cvik aspoň 2×, start aspoň 10 kg e1RM).
// onlyKey = jeden konkrétní klíč (dohledání dat získání úrovní).
const BIG3 = [...LIFTS.bench, ...LIFTS.squat, ...LIFTS.deadlift];
function selfLifts(ws, { lifts = [], now, onlyKey = null }) {
  const info = new Map();
  for (const w of ws) for (const e of w.exercises) {
    if (e.type === 'time' || (onlyKey && e.key !== onlyKey)) continue;
    const v = bestE1Of(e.sets);
    if (!(v > 0)) continue;
    let x = info.get(e.key);
    if (!x) { x = { key: e.key, name: e.name, first: v, firstDate: w.startedAt, best: v, bestDate: w.startedAt, n: 0, recent: 0 }; info.set(e.key, x); }
    x.name = e.name; x.n++;
    if (w.startedAt > now - 120 * DAY) x.recent++;
    if (v > x.best) { x.best = v; x.bestDate = w.startedAt; }
  }
  let list;
  if (onlyKey) list = [...info.values()];
  else if (lifts.length) list = lifts.map((k) => info.get(k)).filter(Boolean).slice(0, MAX_SELF_LIFTS);
  else {
    const big = (k) => (BIG3.includes(k) ? 0 : 1);
    list = [...info.values()].filter((x) => x.first >= 10 && x.n >= 2 && (isCompound(x.name) || BIG3.includes(x.key)))
      .sort((a, b) => big(a.key) - big(b.key) || b.recent - a.recent || b.n - a.n)
      .slice(0, MAX_SELF_LIFTS);
  }
  return list.map((x) => ({ ...x, pct: x.n >= 3 ? Math.max(0, (x.best / x.first - 1) * 100) : 0 }));
}
// Kandidáti pro ruční výběr: váhové cviky s historií, vícekloubové napřed, pak podle počtu tréninků
export function liftCandidates(workouts) {
  const m = new Map();
  for (const w of workouts) for (const e of w.exercises) {
    if (e.type === 'time' || !(bestE1Of(e.sets) > 0)) continue;
    const x = m.get(e.key) || { key: e.key, name: e.name, n: 0, compound: isCompound(e.name) || BIG3.includes(e.key) };
    x.n++; m.set(e.key, x);
  }
  return [...m.values()].sort((a, b) => Number(b.compound) - Number(a.compound) || b.n - a.n);
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
    const v = bestE1Of(e.sets);
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
export function milestones(workouts, { goal = 3, groups = [], body = [], scale = 'self', breaks = [], lifts = [], now = Date.now(), only = null } = {}) {
  const ws = chrono(workouts.filter((w) => w.startedAt <= now));
  const mode = normScale(scale);
  const sc = SCALES[mode] || null;
  const want = (...ids) => !only || ids.includes(baseId(only));
  const recs = want('prs') ? recordsTimeline(ws) : new Map();
  const out = [];
  const push = (id, value, tiers, extra = {}) => {
    if (!want(baseId(id)) || (only && isLiftId(only) && id !== only)) return;
    const tier = tierOf(value, tiers);
    const next = tier < tiers.length ? tiers[tier] : null;
    const prev = tier ? tiers[tier - 1] : 0;
    const pct = next == null ? 1 : Math.max(0, Math.min(1, (value - prev) / (next - prev)));
    out.push({ id, value, tier, max: tiers.length, next, pct, ...(SECRET.has(id) ? { secret: true } : {}), ...extra });
  };

  // Objem a konzistence
  push('workouts', ws.length, TIERS.workouts);
  push('tonnage', ws.reduce((s, w) => s + workoutVolume(w), 0) / 1000, TIERS.tonnage);
  if (want('streak')) push('streak', bestStreak(ws, goal, now, breaks), TIERS.streak);
  if (want('perfect')) push('perfect', perfectMonths(ws, goal, now, breaks), TIERS.perfect);
  if (groups.some((g) => ws.some((w) => w.group === g))) push('balanced', balancedMonths(ws, groups, now), TIERS.balanced);
  push('explorer', new Set(ws.flatMap((w) => w.exercises.filter((e) => e.sets.length).map((e) => e.key))).size, TIERS.explorer);
  const first = ws[0]?.startedAt;
  const years = first ? Math.floor((now - first) / (365.25 * DAY)) : 0;
  push('anniversary', years, TIERS.anniversary, { first, nextDate: first ? new Date(first).setFullYear(new Date(first).getFullYear() + years + 1) : null });

  // Heat
  if (want('steady', 'forged')) {
    const days = dailyHeat(ws, goal, now, breaks);
    let run = 0, steady = 0, forged = 0;
    for (const { h } of days) {
      if (h >= 25) { run++; steady = Math.max(steady, run); } else run = 0;
      if (h >= 80) forged++;
    }
    push('steady', steady, TIERS.steady, { current: run });
    push('forged', forged, TIERS.forged);
  }
  if (want('rekindled')) {
    const units = heatUnits(ws, goal, breaks);
    const backs = units.filter((x) => x.back);
    push('rekindled', backs.length, TIERS.rekindled, { last: backs.length ? backs[backs.length - 1].t : null });
  }

  // Síla vůči sobě
  if (want('lift')) {
    for (const x of selfLifts(ws, { lifts, now, onlyKey: only && isLiftId(only) ? only.slice(5) : null })) {
      push('lift:' + x.key, x.pct, LIFT_TIERS, { lift: x.name, key: x.key, from: Math.round(x.first * 10) / 10, to: Math.round(x.best * 10) / 10, sessions: x.n, few: x.n < 3, bestDate: x.bestDate });
    }
  }
  // Volitelně: vůči tělesné váze (muži / ženy)
  if (sc) {
    const bwNow = body.length ? bodyAvg(body, now) : null;
    const e1s = {};
    for (const id of ['bench', 'squat', 'deadlift', 'ohp']) {
      if (!want(id, 'total')) continue;
      const b = liftBests(ws, LIFTS[id], body);
      e1s[id] = b.e1;
      if (!want(id)) continue;
      const tiers = sc[id];
      const tier = tierOf(b.ratio, tiers);
      const next = tier < tiers.length ? tiers[tier] : null;
      push(id, b.ratio, tiers, { kg: Math.round(b.e1 * 10) / 10, best: b.best, lift: b.name, bwNow, needKg: next != null && bwNow ? Math.max(0, Math.ceil((next * bwNow - b.e1) / 2.5) * 2.5) : null, nobody: !body.length, bench: true });
    }
    if (want('total')) {
      // Big three: součet nejlepších e1RM benche, dřepu a mrtvého tahu vůči průměrné váze za 90 dní
      const total = (e1s.bench || 0) + (e1s.squat || 0) + (e1s.deadlift || 0);
      const all3 = e1s.bench > 0 && e1s.squat > 0 && e1s.deadlift > 0;
      const tRatio = all3 && bwNow ? total / bwNow : 0;
      const tTier = tierOf(tRatio, sc.total);
      const tNext = tTier < sc.total.length ? sc.total[tTier] : null;
      push('total', tRatio, sc.total, { kg: Math.round(total * 10) / 10, lifts: { bench: Math.round((e1s.bench || 0) * 10) / 10, squat: Math.round((e1s.squat || 0) * 10) / 10, deadlift: Math.round((e1s.deadlift || 0) * 10) / 10 }, bwNow, missing: !all3, nobody: !body.length, needKg: tNext != null && bwNow && all3 ? Math.max(0, Math.ceil((tNext * bwNow - total) / 2.5) * 2.5) : null, bench: true });
    }
    if (want('pullups')) {
      const pu = pullupBests(ws);
      push('pullups', pu.reps, sc.pullups, { best: pu.best, lift: pu.name, bench: true });
    }
  }

  // Progres a rekordy
  push('levelup', levelUps(ws), TIERS.levelup);
  const g = want('growth') ? growthOf(ws) : { pct: 0 };
  push('growth', g.pct, TIERS.growth, { lift: g.name, from: g.from, to: g.to });
  let prs = 0;
  for (const w of ws) prs += (recs.get(w.id) || []).length;
  push('prs', prs, TIERS.prs);

  // Tajné (zobrazí se až po získání)
  const dows = new Set(ws.map((w) => new Date(w.startedAt).getDay()));
  push('fullweek', dows.size === 7 ? 1 : 0, TIERS.fullweek);
  const monthsByYear = new Map();
  for (const w of ws) { const d = new Date(w.startedAt); const y = d.getFullYear(); if (!monthsByYear.has(y)) monthsByYear.set(y, new Set()); monthsByYear.get(y).add(d.getMonth()); }
  push('yearround', [...monthsByYear.values()].some((s) => s.size === 12) ? 1 : 0, TIERS.yearround);
  // Nový začátek: trénink v prvním lednovém týdnu (1.–7. 1.)
  push('newyear', ws.some((w) => { const d = new Date(w.startedAt); return d.getMonth() === 0 && d.getDate() <= 7; }) ? 1 : 0, TIERS.newyear);

  const groupOf = Object.fromEntries(MILESTONE_GROUPS.flatMap(([gr, ids]) => ids.map((id) => [id, gr])));
  return out.map((m) => ({ ...m, group: groupOf[baseId(m.id)] }));
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

// Nejbližší další úroveň (nejvyšší rozpracovanost, ne maxed). Benchmarky vůči tělesné váze se tu NIKDY neukazují –
// „nejbližší cíl“ má být o pravidelnosti a vlastním pokroku, ne o kilech, která chybí do poměru.
export function closestMilestone(list) {
  return list
    .filter((m) => m.next != null && m.pct > 0 && m.pct < 1 && !m.bench && !m.few && !m.secret && m.max > 1 && m.id !== 'anniversary')
    .sort((a, b) => b.pct - a.pct)[0] || null;
}
export const milestoneTiers = (list) => list.filter((m) => !m.secret || m.tier).reduce((s, m) => s + m.tier, 0);
export const milestoneMax = (list) => list.filter((m) => !m.secret || m.tier).reduce((s, m) => s + m.max, 0);

// ——— Within reach (aktivní trénink) ———
// Rekordy, které aplikace hlídá a oslavuje, jsou záměrně „rozumné“:
//   e1   odhad 1RM jen ze sérií do 10 opakování (nad 10 je odhad nepřesný a rekord by padal z lehkých sérií)
//   reps rekord pro daný počet opakování: nejtěžší váha na N opakování (N ≤ 12), ne „víc opakování s lehčí váhou“
export const E1_REC_MAX = 10, RM_MAX = 12;
// Map(key → { e1, rm: [_, w1, w2, …, w12] }) z dokončených tréninků; rm[r] = nejtěžší váha zvednutá aspoň r×
export function liftStats(workouts) {
  const out = new Map();
  for (const w of workouts) for (const e of w.exercises) {
    if (e.type === 'time') continue;
    let st = out.get(e.key);
    for (const s of e.sets) {
      if (s.warm) continue;
      const wt = num(s.weight), r = num(s.reps);
      if (!(wt > 0) || !(r > 0) || num(s.time) > 0) continue;
      if (!st) { st = { e1: 0, rm: [] }; out.set(e.key, st); }
      if (r <= E1_REC_MAX) st.e1 = Math.max(st.e1, e1rm(wt, r));
      for (let k = 1; k <= Math.min(r, RM_MAX); k++) if (!(st.rm[k] >= wt)) st.rm[k] = wt;
    }
  }
  return out;
}

// Druh rekordu, který by série (váha × opakování) překonala, nebo null. pb = uložený rekord cviku (nejtěžší série).
export function recordKind(wt, r, pb, stat) {
  if (!(wt > 0) || !(r > 0)) return null;
  if (pb && !(pb.time > 0) && better({ weight: wt, reps: r, time: 0 }, pb)) return 'pb';
  if (!stat) return null;
  if (stat.e1 > 0 && r <= E1_REC_MAX && e1rm(wt, r) > stat.e1 + 0.05) return 'e1';
  if (r <= RM_MAX && stat.rm[r] > 0 && wt > stat.rm[r]) return 'reps';
  return null;
}

// „Rekord na dosah“ – jen doplněk k cíli progrese, nikdy jeho náhrada:
//  • žádná nápověda, když cíl říká držet / ubrat / lehký týden (target.hold nebo state)
//  • jen stejná váha jako cíl: buď už cíl sám je rekord, nebo o 1 opakování víc (v rámci rozsahu) – žádné singly „× 1“
// ex = cvik v tréninku, target = cíl nejtěžší série. → { kind, weight, reps, atTarget, setId } | null
export function reachHint(ex, pb, stat, target, hi = Infinity) {
  if (!ex || ex.type === 'time' || !target || target.hold || target.state || !(target.weight > 0)) return null;
  const open = ex.sets.filter((s) => !s.warm && !s.done && num(s.weight) > 0 && num(s.reps) > 0);
  if (!open.length) return null;
  const top = open.map((s) => ({ id: s.id, weight: num(s.weight), reps: num(s.reps) })).sort((a, b) => b.weight - a.weight || b.reps - a.reps)[0];
  if (top.weight !== target.weight) return null;
  const at = recordKind(target.weight, target.reps, pb, stat);
  if (at) return { kind: at, weight: target.weight, reps: target.reps, atTarget: true, setId: top.id };
  const plus = target.reps + 1;
  if (plus > hi) return null;
  const k = recordKind(target.weight, plus, pb, stat);
  return k ? { kind: k, weight: target.weight, reps: plus, atTarget: false, setId: top.id } : null;
}

// Druh rekordu, který odškrtnutá série překonala (vůči historii), nebo null
export function setRecord(set, pb, stat, timed = false) {
  if (!set || set.warm) return null;
  const wt = num(set.weight), r = num(set.reps), tm = num(set.time);
  if (timed) return pb && better({ weight: wt, reps: 0, time: tm }, pb) ? 'pb' : null;
  return recordKind(wt, r, pb, stat);
}

// ——— Monthly recap ———
export function monthRecap(workouts, { month, goal = 3, groups = [], body = [], scale = 'self', breaks = [], lifts = [], now = Date.now() } = {}) {
  const start = monthStart(month), end = addMonths(start, 1);
  const ws = chrono(workouts.filter((w) => w.startedAt >= start && w.startedAt < end));
  const recs = recordsTimeline(workouts.filter((w) => w.startedAt < end));
  const records = ws.reduce((n, w) => n + (recs.get(w.id) || []).length, 0);
  const st = new Map(weekStatuses(workouts.filter((w) => w.startedAt < end), goal, breaks, Math.min(now, end - 1)).map((w) => [w.mon, w.status]));
  const mons = mondaysIn(start, Math.min(end, now));
  const weeksMet = mons.filter((d) => ['met', 'deload'].includes(st.get(d))).length;
  const weeksKept = mons.filter((d) => KEPT.has(st.get(d))).length;
  const units = heatUnits(workouts, goal, breaks);
  const days = [];
  for (let d = new Date(start); d.getTime() < end; d.setDate(d.getDate() + 1)) {
    const at = d.getTime() + DAY - 1;
    days.push(at > now ? null : heatFromUnits(units, goal, breaks, at));
  }
  // Nejlepší zvednutí měsíce (nejvyšší e1RM série do 10 opakování)
  let best = null;
  for (const w of ws) for (const e of w.exercises) for (const s of e.sets) {
    if (s.warm || e.type === 'time') continue;
    const wt = num(s.weight), r = num(s.reps);
    if (!(wt > 0) || !(r > 0) || r > E1_MAX) continue;
    const v = e1rm(wt, r);
    if (!best || v > best.e1) best = { name: e.name, weight: wt, reps: r, e1: v };
  }
  // Největší skok: nejlepší e1RM v měsíci vs. nejlepší před ním
  const pre = liftStats(workouts.filter((w) => w.startedAt < start));
  const cur = liftStats(ws);
  let jump = null;
  for (const [key, x] of cur) {
    const p = pre.get(key);
    if (!p?.e1) continue;
    const d = x.e1 - p.e1;
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
  const opts = { goal, groups, body, scale, breaks, lifts };
  const a = milestones(workouts, { ...opts, now: start - 1 }), b = milestones(workouts, { ...opts, now: Math.min(now, end - 1) });
  const gained = b.filter((m) => m.tier > (a.find((x) => x.id === m.id)?.tier || 0)).map((m) => ({ id: m.id, tier: m.tier, lift: m.lift }));
  return {
    month: start, workouts: ws.length, records, weeksMet, weeksKept, weeks: mons.length, heat: days,
    best, jump, topGroup: top ? { group: top[0], n: top[1] } : null, gained,
    volume: ws.reduce((s, w) => s + workoutVolume(w), 0),
  };
}
