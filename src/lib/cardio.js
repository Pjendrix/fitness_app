// Kardio: rychlé záznamy aktivit mimo posilovnu + kardio cviky z tréninků. Čisté funkce, testy v cardio.test.js.
// WHO 2020: 150–300 min středně intenzivní (nebo 75–150 min intenzivní) aerobní aktivity týdně;
// intenzivní minuta se počítá dvakrát. Kardio se NEPOČÍTÁ do týdenního cíle tréninků ani do Heatu.
import { uid } from './util.js';

export const ACTIVITY_KINDS = ['run', 'bike', 'walk', 'swim', 'machine', 'other'];
export const ACTIVITY_MAX_MIN = 600;
export const ACTIVITY_LIMIT = 500;
const DAY = 864e5;

export const validActivity = (a) => Boolean(a) && ACTIVITY_KINDS.includes(a.kind) && Number.isInteger(a.minutes) && a.minutes >= 1 && a.minutes <= ACTIVITY_MAX_MIN && Number.isFinite(a.date);
// Nový záznam (datum = poledne zvoleného dne, ať se nepřehoupne při změně pásma)
export function activityEntry({ kind, minutes, vigorous = false, when = Date.now() }) {
  const d = new Date(when); d.setHours(12, 0, 0, 0);
  return { id: uid(), date: d.getTime(), kind: ACTIVITY_KINDS.includes(kind) ? kind : 'other', minutes: Math.min(ACTIVITY_MAX_MIN, Math.max(1, Math.round(Number(minutes) || 0))), vigorous: Boolean(vigorous) };
}
// Započtené minuty podle WHO (intenzivní × 2)
export const whoMinutes = (a) => a.minutes * (a.vigorous ? 2 : 1);

// Kardio cviky v trénincích (časové cviky z kategorie kardio) → [{ date, minutes, name }]
export function workoutCardio(workouts, isCardio) {
  const out = [];
  for (const w of workouts) for (const e of w.exercises) {
    if (e.type !== 'time' || !isCardio(e.name)) continue;
    const min = e.sets.reduce((s, x) => s + (Number(x.time) || 0), 0);
    if (min > 0) out.push({ date: w.startedAt, minutes: Math.round(min), name: e.name, workoutId: w.id });
  }
  return out;
}

// Týden od pondělí `mon`: { total (WHO minuty), moderate, vigorous, gym, items }
export function cardioWeek(activities, workouts, isCardio, mon) {
  const end = mon + 7 * DAY;
  const inWeek = (t) => t >= mon && t < end;
  const acts = activities.filter((a) => inWeek(a.date));
  const gym = workoutCardio(workouts.filter((w) => inWeek(w.startedAt)), isCardio);
  const moderate = acts.filter((a) => !a.vigorous).reduce((s, a) => s + a.minutes, 0) + gym.reduce((s, g) => s + g.minutes, 0);
  const vigorous = acts.filter((a) => a.vigorous).reduce((s, a) => s + a.minutes, 0);
  return { total: moderate + 2 * vigorous, moderate, vigorous, gym: gym.reduce((s, g) => s + g.minutes, 0), items: acts.sort((a, b) => b.date - a.date) };
}
