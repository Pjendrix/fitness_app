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

export const planLabel = (e) =>
  !e.reps || !/^(\d|max)/.test(e.reps) ? t('count.sets', { n: e.sets }) : `${e.sets}× ${e.reps}`;

// ——— Validace vstupů (poslední obrana před zápisem; rules hlídají strukturu) ———
export const LIMITS = { weight: 500, reps: 200, time: 600, name: 80, variant: 40, exercises: 40, library: 1500 };
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
  (active?.exercises || []).reduce((n, e) => n + e.sets.filter((s) => !s.done && hasValue(s, e.type === 'time')).length, 0);
