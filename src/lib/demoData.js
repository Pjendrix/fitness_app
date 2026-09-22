// Ukázková data pro demo: ~16 týdnů PUSH/PULL/LEGS s postupným zvyšováním vah.
// Generuje se vždy relativně k dnešku, takže demo nestárne. Deterministické (stejný seed).
import { PROFILES } from '../data/defaultTemplates.js';
import { exKey, firstNum, num, uid } from './util.js';
import { applyWorkout } from './records.js';

const WEEKS = 16;
const SKIP_WEEKS = new Set([5, 11]); // dovolená / nemoc – ať to vypadá reálně

export function generateDemo(now = Date.now()) {
  let seed = 20260922;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const tpls = PROFILES.krystof.templates;
  const pick = (group, hard) => tpls.find((x) => x.group === group && x.variant === (hard ? 'Hardcore' : 'Normal')) || tpls.find((x) => x.group === group);
  const round = (w) => (w < 12 ? Math.round(w * 2) / 2 : w < 40 ? Math.round(w) : Math.round(w / 2.5) * 2.5);

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const first = new Date(today);
  first.setDate(today.getDate() - ((today.getDay() + 6) % 7) - WEEKS * 7); // pondělí před 16 týdny

  const workouts = [];
  let rotation = 0;
  for (let d = 0; ; d++) {
    const day = new Date(first);
    day.setDate(first.getDate() + d);
    if (day >= today) break;
    const week = Math.floor(d / 7), wd = (day.getDay() + 6) % 7; // 0 = pondělí
    if (SKIP_WEEKS.has(week)) continue;
    const trains = [0, 2, 4].includes(wd) ? rnd() < 0.93 : wd === 5 ? rnd() < 0.4 : false;
    if (!trains) continue;

    const group = ['PUSH', 'PULL', 'LEGS'][rotation++ % 3];
    const hard = rnd() < 0.25;
    const tpl = pick(group, hard);
    const progress = d / (WEEKS * 7); // 0 → 1
    const start = new Date(day);
    start.setHours(17, 15 + Math.floor(rnd() * 150), 0, 0);
    const startedAt = start.getTime();

    const exercises = tpl.exercises.map((e) => {
      const timed = e.type === 'time';
      const sets = Array.from({ length: e.sets }, (_, i) => {
        const p = e.plan?.[i] || e.plan?.[e.plan.length - 1];
        if (timed) return { weight: p?.w || 0, reps: 0, time: Math.max(1, Math.round(((p?.t || 1) * (0.85 + 0.3 * progress)) * 2) / 2) };
        const base = num(p?.w ?? e.weight);
        const weight = base > 0 ? round(base * (0.82 + 0.24 * progress + (rnd() - 0.5) * 0.04)) : 0;
        const target = typeof p?.r === 'number' ? p.r : Number(firstNum(e.reps)) || 10;
        const reps = Math.max(1, target + (rnd() < 0.25 ? -1 : 0) + (rnd() < 0.2 ? 1 : 0) + (base > 0 ? 0 : Math.round(progress * 3)));
        return { weight, reps };
      });
      return { key: exKey(e.name), name: e.name, ...(timed ? { type: 'time' } : {}), sets };
    });

    workouts.push({
      id: uid(), templateId: tpl.id, name: tpl.name, group: tpl.group, variant: tpl.variant,
      startedAt, finishedAt: startedAt + (48 + Math.floor(rnd() * 35)) * 60000, exercises,
    });
  }

  let prs = {};
  for (const w of workouts) prs = applyWorkout(w, prs).next; // chronologicky
  return { templates: [], workouts, prs, exercises: [], profile: 'krystof', settings: { weeklyGoal: 3 } };
}
