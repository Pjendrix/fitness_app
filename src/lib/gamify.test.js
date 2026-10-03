import { describe, expect, it } from 'vitest';
import {
  bestStreak, closestMilestone, coolDays, heatAt, heatInfo, heatState, liftStats, milestones, monday, monthRecap,
  perfectMonths, reachHint, setRecord,
} from './gamify.js';
import { generateDemo } from './demoData.js';

const DAY = 864e5;
const NOW = new Date(2026, 9, 3, 18, 0).getTime(); // so 3. 10. 2026
let n = 0;
const W = (daysAgo, ex = [], extra = {}) => ({
  id: 'w' + n++, name: 'W', group: 'PUSH', startedAt: NOW - daysAgo * DAY, finishedAt: NOW - daysAgo * DAY + 3600e3,
  exercises: ex.map(([key, sets, more]) => ({ key, name: key, sets: sets.map(([weight, reps, time]) => ({ weight, reps, time })), ...more })), ...extra,
});

describe('heat', () => {
  it('no workouts → 0, cold', () => {
    expect(heatAt([], 3, NOW)).toBe(0);
    expect(heatState(0).id).toBe('cold');
  });
  it('training at the weekly goal pace holds glowing', () => {
    const ws = Array.from({ length: 30 }, (_, i) => W(i * (7 / 3)));
    const h = heatAt(ws, 3, NOW + DAY);
    expect(h).toBeGreaterThanOrEqual(50);
    expect(h).toBeLessThan(90);
  });
  it('cools down without training', () => {
    const ws = Array.from({ length: 30 }, (_, i) => W(10 + i * (7 / 3)));
    expect(heatAt(ws, 3, NOW)).toBeLessThan(heatAt(ws, 3, NOW - 9 * DAY));
  });
  it('capped at 100', () => expect(heatAt(Array.from({ length: 40 }, (_, i) => W(i * 0.5)), 3, NOW)).toBe(100));
  it('coolDays: days until below the current state', () => {
    expect(coolDays(0)).toBeNull();
    expect(coolDays(72)).toBe(Math.ceil(Math.log(72 / 50) * 7));
  });
  it('heatInfo bars: 28 days, today last with the current value', () => {
    const info = heatInfo([W(0), W(3)], 3, NOW);
    expect(info.bars).toHaveLength(28);
    expect(info.bars[27]).toMatchObject({ on: true, h: info.heat });
    expect(info.bars[24].on).toBe(true);
    expect(info.bars[24].h).toBeGreaterThan(info.bars[23].h); // trénink = skok nahoru
  });
});

describe('streaks and months', () => {
  it('best streak counts goal weeks in a row', () => {
    const mon = monday(NOW);
    const at = (weeksAgo, d) => ({ ...W(0), startedAt: mon - weeksAgo * 7 * DAY + d * DAY + 3600e3 });
    const ws = [at(5, 0), at(5, 2), at(4, 0), at(4, 1), at(2, 0), at(2, 2), at(1, 0), at(1, 3), at(0, 0)];
    expect(bestStreak(ws, 2, NOW)).toBe(2);
  });
  it('perfect month needs every week of a completed month', () => {
    const ws = [];
    for (let d = new Date(2026, 8, 1); d.getMonth() === 8; d.setDate(d.getDate() + 1)) if (d.getDay() % 2) ws.push({ ...W(0), startedAt: d.getTime() + 10 * 3600e3 });
    expect(perfectMonths(ws, 2, NOW)).toBe(1);
    expect(perfectMonths(ws, 4, NOW)).toBe(0);
  });
});

describe('milestones', () => {
  const body = [{ id: 'x', date: NOW - 30 * DAY, weight: 80 }];
  it('bench vs bodyweight with both scales', () => {
    const ws = [W(1, [['bench-press-barbell', [[80, 3], [85, 1]]]])];
    const std = milestones(ws, { body, now: NOW }).find((m) => m.id === 'bench');
    expect(std.tier).toBe(3); // 85/80 = 1,06 → I 0,5 · II 0,75 · III 1
    expect(std.next).toBe(1.25);
    expect(std.needKg).toBe(15); // 100 kg − 85 kg
    const light = milestones(ws, { body, now: NOW, scale: 'lighter' }).find((m) => m.id === 'bench');
    expect(light.tier).toBe(5);
    expect(light.next).toBeNull();
  });
  it('warm-up sets do not count', () => {
    const ws = [{ ...W(1), exercises: [{ key: 'squat', name: 'Squat', sets: [{ weight: 200, reps: 1, warm: true }, { weight: 50, reps: 5 }] }] }];
    expect(milestones(ws, { body, now: NOW }).find((m) => m.id === 'squat').tier).toBe(0);
  });
  it('no body weight → flagged, not offered as closest', () => {
    const list = milestones([W(1, [['bench-press-barbell', [[60, 5]]]])], { now: NOW });
    expect(list.find((m) => m.id === 'bench').nobody).toBe(true);
    expect(closestMilestone(list)?.id).not.toBe('bench');
  });
  it('workouts, records, level ups, explorer', () => {
    const ws = [
      W(40, [['a', [[50, 5]]], ['b', [[20, 8]]], ['c', [[10, 10]]]], { startedAt: new Date(2026, 7, 20, 6, 30).getTime() }),
      W(2, [['a', [[55, 5]]], ['b', [[22, 8]]], ['c', [[12, 10]]]]),
    ];
    const by = Object.fromEntries(milestones(ws, { now: NOW }).map((m) => [m.id, m]));
    expect(by.workouts.value).toBe(2);
    expect(by.prs.value).toBe(3);
    expect(by.hot.value).toBe(3);
    expect(by.levelup.value).toBe(3);
    expect(by.explorer.value).toBe(3);
  });
  it('big three total vs bodyweight, flagged when a lift is missing', () => {
    const ws = [W(2, [['bench-press-barbell', [[80, 1]]], ['squat', [[100, 1]]], ['deadlift', [[140, 1]]]])];
    const t = milestones(ws, { body, now: NOW }).find((m) => m.id === 'total');
    expect(t.value).toBeCloseTo(4); // 320 / 80
    expect(t.tier).toBe(4);
    expect(milestones([W(2, [['squat', [[100, 1]]]])], { body, now: NOW }).find((m) => m.id === 'total').missing).toBe(true);
  });
  it('growth: e1RM % vs first session, needs 3 sessions', () => {
    const ws = [W(30, [['row', [[50, 10]]]]), W(20, [['row', [[55, 10]]]]), W(10, [['row', [[60, 10]]]])];
    const g = milestones(ws, { now: NOW }).find((m) => m.id === 'growth');
    expect(Math.round(g.value)).toBe(20);
    expect(g.lift).toBe('row');
    expect(milestones(ws.slice(0, 2), { now: NOW }).find((m) => m.id === 'growth').value).toBe(0);
  });
  it('heat milestones: steady flame and forged from regular training', () => {
    const ws = Array.from({ length: 60 }, (_, i) => W(i * 1.5));
    const by = Object.fromEntries(milestones(ws, { now: NOW, goal: 3 }).map((m) => [m.id, m]));
    expect(by.steady.value).toBeGreaterThanOrEqual(80);
    expect(by.forged.value).toBeGreaterThan(0);
    expect(by.rekindled.value).toBe(0);
  });
  it('rekindled: back from cold to glowing within a week', () => {
    const ws = [...Array.from({ length: 10 }, (_, i) => W(60 + i * 2)), ...Array.from({ length: 6 }, (_, i) => W(6 - i))];
    expect(milestones(ws, { now: NOW, goal: 3 }).find((m) => m.id === 'rekindled').tier).toBe(1);
  });
  it('secret milestones: three in a row, full week', () => {
    const ws = [W(1), W(2), W(3)];
    const by = Object.fromEntries(milestones(ws, { now: NOW }).map((m) => [m.id, m]));
    expect(by.triple).toMatchObject({ tier: 1, secret: true });
    expect(by.fullweek.tier).toBe(0);
    expect(by.fullweek.tier + milestones(Array.from({ length: 7 }, (_, i) => W(i)), { now: NOW }).find((m) => m.id === 'fullweek').tier).toBe(1);
  });
  it('demo data produce sensible milestones', () => {
    const d = generateDemo(NOW);
    const list = milestones(d.workouts, { body: d.body, groups: ['PUSH', 'PULL', 'LEGS'], goal: 3, now: NOW });
    expect(list.find((m) => m.id === 'workouts').tier).toBeGreaterThanOrEqual(1);
    expect(list.every((m) => m.pct >= 0 && m.pct <= 1)).toBe(true);
  });
});

describe('within reach', () => {
  const hist = [W(5, [['bench', [[80, 8], [85, 6]]]])];
  const st = liftStats(hist).get('bench');
  const pb = { weight: 85, reps: 6 };
  const ex = (sets) => ({ key: 'bench', sets: sets.map(([weight, reps, done]) => ({ weight, reps, done })) });
  it('one rep to PB', () => expect(reachHint(ex([[85, 6]]), pb, st)).toEqual({ kind: 'pb', weight: 85, reps: 7 }));
  it('heavier than PB → any rep is a PB', () => expect(reachHint(ex([[87.5, 3]]), pb, st)).toMatchObject({ kind: 'pb', weight: 87.5 }));
  it('e1RM within one rep at a lighter weight', () => {
    // best e1 = 85 × (1 + 6/30) = 102; 80 × 9 = 104
    expect(reachHint(ex([[80, 8]]), pb, st)).toEqual({ kind: 'e1', weight: 80, reps: 9 });
  });
  it('nothing open → null', () => expect(reachHint(ex([[85, 6, true]]), pb, st)).toBeNull());
  it('setRecord kinds', () => {
    expect(setRecord({ weight: 85, reps: 7 }, pb, st)).toBe('pb');
    expect(setRecord({ weight: 80, reps: 9 }, pb, st)).toBe('e1');
    expect(setRecord({ weight: 70, reps: 8 }, pb, { e1: 200, repsAt: new Map([[70, 7]]) })).toBe('reps');
    expect(setRecord({ weight: 60, reps: 5 }, pb, st)).toBeNull();
    expect(setRecord({ weight: 90, reps: 5, warm: true }, pb, st)).toBeNull();
  });
});

describe('month recap', () => {
  it('counts the month and finds the best lift and jump', () => {
    const sep = (d, w) => ({ ...W(0), startedAt: new Date(2026, 8, d, 18).getTime(), exercises: [{ key: 'squat', name: 'Squat', sets: [{ weight: w, reps: 5 }] }] });
    const ws = [{ ...sep(1, 0), startedAt: new Date(2026, 7, 25, 18).getTime(), exercises: [{ key: 'squat', name: 'Squat', sets: [{ weight: 100, reps: 5 }] }] }, sep(3, 105), sep(10, 110)];
    const r = monthRecap(ws, { month: new Date(2026, 8, 15).getTime(), goal: 1 });
    expect(r.workouts).toBe(2);
    expect(r.records).toBe(2);
    expect(r.best).toMatchObject({ name: 'Squat', weight: 110, reps: 5 });
    expect(r.jump.name).toBe('Squat');
    expect(r.heat).toHaveLength(30);
  });
});
