import { describe, expect, it } from 'vitest';
import { activityEntry, cardioWeek, validActivity, whoMinutes } from './cardio.js';

const DAY = 864e5;
const MON = new Date(2026, 8, 28).getTime();

describe('cardio', () => {
  it('activityEntry: noon of the day, clamped minutes, valid', () => {
    const a = activityEntry({ kind: 'run', minutes: '30', vigorous: true, when: MON + 3 * 3600e3 });
    expect(new Date(a.date).getHours()).toBe(12);
    expect(a).toMatchObject({ kind: 'run', minutes: 30, vigorous: true });
    expect(validActivity(a)).toBe(true);
    expect(validActivity({ ...a, minutes: 0 })).toBe(false);
    expect(activityEntry({ kind: 'yoga', minutes: 5 }).kind).toBe('other');
  });
  it('vigorous minutes count double (WHO)', () => expect(whoMinutes({ minutes: 20, vigorous: true })).toBe(40));
  it('week: activities + cardio exercises from workouts, outside the week ignored', () => {
    const acts = [
      { id: '1', date: MON + DAY, kind: 'walk', minutes: 30, vigorous: false },
      { id: '2', date: MON + 2 * DAY, kind: 'run', minutes: 20, vigorous: true },
      { id: '3', date: MON - DAY, kind: 'run', minutes: 60, vigorous: false },
    ];
    const ws = [{ id: 'w', startedAt: MON + 3 * DAY, exercises: [{ key: 'stairmaster', name: 'Stairmaster', type: 'time', sets: [{ time: 20 }] }, { key: 'plank', name: 'Plank', type: 'time', sets: [{ time: 1 }] }] }];
    const w = cardioWeek(acts, ws, (n) => n === 'Stairmaster', MON);
    expect(w).toMatchObject({ moderate: 50, vigorous: 20, total: 90, gym: 20 });
    expect(w.items.map((a) => a.id)).toEqual(['2', '1']);
  });
});
