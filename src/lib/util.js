import { locale, t } from './i18n.js';

export const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 16) : Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

// Exercise key: same name => shared history and PB across templates.
export const exKey = (name) =>
  name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'exercise';

export const num = (v) => {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
export const firstNum = (s) => (String(s || '').match(/\d+/) || [''])[0];

export const fmtNum = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ''));
export const fmtSet = (weight, reps, time) =>
  time > 0 ? `${weight > 0 ? fmtNum(weight) + ' kg · ' : ''}${fmtNum(time)} min` : `${weight > 0 ? fmtNum(weight) + ' kg' : 'BW'} × ${reps}`;
export const fmtS = (s) => fmtSet(s.weight, s.reps, s.time);

// Is a set better than the current PB? Weight wins, reps break ties.
// Timed sets: longer time wins, weight breaks ties.
export const better = (a, b) => {
  if (a.time > 0) {
    if (!b) return true;
    return (a.time || 0) > (b.time || 0) || ((a.time || 0) === (b.time || 0) && a.weight > b.weight);
  }
  if (!(a.reps > 0)) return false;
  if (!b) return true;
  return a.weight > b.weight || (a.weight === b.weight && a.reps > b.reps);
};

export const isDone = (s) => s.done && (num(s.reps) > 0 || num(s.time) > 0);

export const fmtDuration = (ms) => {
  const m = Math.max(0, Math.round(ms / 60000));
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
};
export const fmtClock = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const p = (x) => String(x).padStart(2, '0');
  return h ? `${h}:${p(m)}:${p(r)}` : `${p(m)}:${p(r)}`;
};
export const fmtDate = (ms) =>
  new Date(ms).toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'numeric' });

export const workoutVolume = (w) =>
  w.exercises.reduce((sum, e) => sum + e.sets.reduce((s, x) => s + num(x.weight) * num(x.reps), 0), 0);

export const startOfWeek = () => {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d.getTime();
};

export const clean = (o) => JSON.parse(JSON.stringify(o)); // Firestore rejects undefined

// Horní hranice rozsahu opakování, když ji šablona nemá: do 6 opak. +2, jinak +4
export const defaultTop = (lo) => (lo <= 6 ? lo + 2 : lo + 4);
export const planLabel = (e) => {
  if (!e.reps || !/^(\d|max)/.test(e.reps)) return t('count.sets', { n: e.sets });
  const lo = parseInt(e.reps, 10);
  if (!(lo > 0) || /[-–]/.test(e.reps)) return `${e.sets}× ${e.reps}`;
  return `${e.sets}× ${lo}–${e.repsTo >= lo ? e.repsTo : defaultTop(lo)}`;
};

// ——— Validace vstupů (poslední obrana před zápisem; rules hlídají strukturu) ———
export const LIMITS = { weight: 1000, reps: 200, time: 600, name: 80, variant: 40, exercises: 40, library: 1500 };
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const sanitizeSet = (s, timed) =>
  timed
    ? { weight: clamp(Math.round(num(s.weight) * 100) / 100, 0, LIMITS.weight), reps: 0, time: clamp(Math.round(num(s.time) * 100) / 100, 0, LIMITS.time) }
    : { weight: clamp(Math.round(num(s.weight) * 100) / 100, 0, LIMITS.weight), reps: clamp(Math.round(num(s.reps)), 0, LIMITS.reps) };
export const sanitizeName = (n, max = LIMITS.name) => String(n ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

// Filtry pro textová pole (povolí i rozepsané hodnoty jako "82," nebo "").
export const DECIMAL_INPUT = /^\d{0,3}([.,]\d{0,2})?$/;
export const INT_INPUT = /^\d{0,3}$/;

// Série vyplněná, ale neodškrtnutá
export const hasValue = (s, timed) => (timed ? num(s.time) > 0 : num(s.reps) > 0);
export const countUnchecked = (active) =>
  (active?.exercises || []).reduce((n, e) => n + e.sets.filter((s) => !s.done && !s.warm && hasValue(s, e.type === "time")).length, 0);

// Krátké značky skupin do kolečka dne (C8): jedno písmeno, kolidující skupiny se rozliší prvním odlišným znakem.
// PUSH/PULL/LEGS → PS/PL/L · Upper A/Upper B/Lower A → UA/UB/L… → Map(label → tag)
export const groupTags = (labels) => {
  const list = [...new Set(labels.filter(Boolean))];
  const compact = (l) => l.toUpperCase().replace(/[^\p{L}\p{N}]/gu, '');
  const out = new Map();
  for (const l of list) {
    const c = compact(l);
    const rivals = list.filter((x) => x !== l).map(compact).filter((x) => x[0] === c[0]);
    if (!c) { out.set(l, '•'); continue; }
    if (!rivals.length) { out.set(l, c[0]); continue; }
    let i = 1;
    while (i < c.length && rivals.some((r) => r[i] === c[i])) i++;
    out.set(l, c[0] + (c[i] || c[1] || ''));
  }
  // Pojistka pro shodné značky (např. „AB“ vs „A B“): pořadové číslo
  const seen = new Map();
  for (const [l, tag] of out) { const n = (seen.get(tag) || 0) + 1; seen.set(tag, n); if (n > 1) out.set(l, tag[0] + n); }
  return out;
};

// Hezké dělení osy grafu (B3): ~count úseků po „kulatém“ kroku, osa těsně kolem dat (80–102 → 80–110 po 10).
export const niceScale = (min, max, count = 3) => {
  const lo = Math.min(min, max), hi = Math.max(min, max);
  const span = hi - lo || Math.abs(hi) * 0.1 || 1;
  const raw = span / count;
  const p = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * p).find((m) => m >= raw - 1e-9);
  const round = (v) => Math.round(v / step) * step;
  let yMin = Math.floor(lo / step + 1e-9) * step;
  let yMax = Math.ceil(hi / step - 1e-9) * step;
  if (yMax === yMin) yMax = yMin + step;
  if (lo >= 0 && yMin < 0) yMin = 0;
  const ticks = [];
  for (let v = yMin; v <= yMax + step / 2; v += step) ticks.push(Math.round(round(v) * 1000) / 1000);
  return { yMin: ticks[0], yMax: ticks[ticks.length - 1], step, ticks };
};
