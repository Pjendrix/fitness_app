export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

// Klíč cvičení: stejné jméno => sdílená historie a PB napříč šablonami.
export const exKey = (name) =>
  name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cviceni';

export const num = (v) => {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
export const firstNum = (s) => (String(s || '').match(/\d+/) || [''])[0];

export const fmtNum = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ''));
export const fmtSet = (weight, reps) => `${weight > 0 ? fmtNum(weight) + ' kg' : 'BW'} × ${reps}`;

// Je série „lepší" než dosavadní PB? Rozhoduje váha, při shodě opakování.
export const better = (a, b) => {
  if (!(a.reps > 0)) return false;
  if (!b) return true;
  return a.weight > b.weight || (a.weight === b.weight && a.reps > b.reps);
};

export const isDone = (s) => s.done && num(s.reps) > 0;

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
  new Date(ms).toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'numeric' });

export const workoutVolume = (w) =>
  w.exercises.reduce((sum, e) => sum + e.sets.reduce((s, x) => s + num(x.weight) * num(x.reps), 0), 0);

export const startOfWeek = () => {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // pondělí = 0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d.getTime();
};

export const clean = (o) => JSON.parse(JSON.stringify(o)); // Firestore nesnáší undefined

export const planLabel = (e) =>
  !e.reps ? `${e.sets} sérií` : /^\d/.test(e.reps) ? `${e.sets}× ${e.reps}` : e.reps === 'max' ? `${e.sets}× max` : `${e.sets} sérií · ${e.reps}`;
