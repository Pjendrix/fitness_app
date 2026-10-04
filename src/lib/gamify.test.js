import { describe, expect, it } from 'vitest';
import {
  bestStreak, closestMilestone, heatAt, heatInfo, heatState, heatUnits, liftStats, milestones, monday, monthRecap,
  perfectMonths, reachHint, setRecord, streaks, weekStatuses, liftCandidates,
} from './gamify.js';
import { generateDemo } from './demoData.js';

const DAY = 864e5;
const NOW = new Date(2026, 9, 3, 18, 0).getTime(); // so 3. 10. 2026
let n = 0;
const W = (daysAgo, ex = [], extra = {}) => ({
  id: 'w' + n++, name: 'W', group: 'PUSH', startedAt: NOW - daysAgo * DAY, finishedAt: NOW - daysAgo * DAY + 3600e3,
  exercises: ex.map(([key, sets, more]) => ({ key, name: key, sets: sets.map(([weight, reps, time]) => ({ weight, reps, time })), ...more })), ...extra,
});
// Tréninky v pevné dny týdne (0 = pondělí) po `weeks` týdnů končící tímto týdnem
const weekly = (days, weeks) => {
  const mon = monday(NOW), out = [];
  for (let w = weeks - 1; w >= 0; w--) for (const d of days) {
    const t = mon - w * 7 * DAY + d * DAY + 18 * 3600e3;
    if (t <= NOW) out.push({ id: 'k' + n++, name: 'W', startedAt: t, finishedAt: t + 1, exercises: [] });
  }
  return out;
};

describe('heat', () => {
  it('no workouts → 0, cold', () => {
    expect(heatAt([], 3, NOW)).toBe(0);
    expect(heatState(0).id).toBe('cold');
  });
  it('training at your own goal pace keeps you White-hot', () => {
    expect(heatAt(weekly([0, 2, 4], 10), 3, NOW)).toBeGreaterThanOrEqual(80);
  });
  it('training above the goal does not add Heat (weekly cap)', () => {
    const atGoal = heatAt(weekly([0, 2, 4], 10), 3, NOW);
    const above = heatAt(weekly([0, 1, 2, 3, 4], 10), 3, NOW);
    expect(above).toBeLessThanOrEqual(atGoal);
    const u = heatUnits(weekly([0, 1, 2, 3, 4], 2), 3);
    expect(u).toHaveLength(10);
    expect(u.filter((x) => x.u > 0)).toHaveLength(6); // počítají se jen 3 za týden
  });
  it('two workouts on one day count once', () => {
    const a = heatAt([W(1), W(5)], 3, NOW);
    const b = heatAt([W(1), { ...W(1), id: 'dup' }, W(5)], 3, NOW);
    expect(b).toBe(a);
  });
  it('comeback after 7+ days counts double', () => {
    const units = heatUnits([W(20), W(10)], 3);
    expect(units[1]).toMatchObject({ back: true, u: 2 });
  });
  it('a pause freezes Heat', () => {
    const ws = weekly([0, 2, 4], 6).filter((w) => w.startedAt < NOW - 14 * DAY);
    const before = heatAt(ws, 3, NOW - 14 * DAY + DAY);
    const breaks = [{ kind: 'pause', from: NOW - 14 * DAY + DAY, to: null }];
    expect(heatAt(ws, 3, NOW, breaks)).toBe(before);
    expect(heatAt(ws, 3, NOW)).toBeLessThan(before);
  });
  it('heatInfo bars: 28 days, today last with the current value', () => {
    const info = heatInfo([W(0), W(3)], 3, NOW);
    expect(info.bars).toHaveLength(28);
    expect(info.bars[27]).toMatchObject({ on: true, h: info.heat });
    expect(info.bars[24].on).toBe(true);
    expect(info.bars[24].h).toBeGreaterThan(info.bars[23].h); // trénink = skok nahoru
  });
});

describe('weeks, streaks and months', () => {
  const mon = monday(NOW);
  const at = (weeksAgo, d) => ({ ...W(0), startedAt: mon - weeksAgo * 7 * DAY + d * DAY + 3600e3 });
  it('one missed week is forgiven (joker), the second within 4 weeks breaks the streak', () => {
    const ws = [at(6, 0), at(6, 2), at(5, 0), at(5, 2), /* 4: miss */ at(3, 0), at(3, 2), /* 2: miss */ at(1, 0), at(1, 2), at(0, 0)];
    const st = weekStatuses(ws, 2, [], NOW).map((w) => w.status);
    expect(st).toEqual(['met', 'met', 'joker', 'met', 'miss', 'met', 'open']);
    expect(streaks(weekStatuses(ws, 2, [], NOW))).toEqual({ current: 1, best: 3 });
    expect(bestStreak(ws, 2, NOW)).toBe(3);
  });
  it('pause and light week keep the streak', () => {
    const ws = [at(3, 0), at(3, 2), at(2, 0), at(0, 0), at(0, 1)];
    const breaks = [{ kind: 'pause', from: mon - 1 * 7 * DAY, to: mon - 1 * 7 * DAY + 5 * DAY }, { kind: 'deload', from: mon - 2 * 7 * DAY, to: mon - 2 * 7 * DAY + 7 * DAY }];
    const st = weekStatuses(ws, 2, breaks, NOW);
    expect(st.map((w) => w.status)).toEqual(['met', 'deload', 'pause', 'met']);
    expect(streaks(st).current).toBe(3);
  });
  it('perfect month: no missed week (jokers count), at least one met', () => {
    const ws = [];
    for (let d = new Date(2026, 8, 1); d.getMonth() === 8; d.setDate(d.getDate() + 1)) if (d.getDay() % 2) ws.push({ ...W(0), startedAt: d.getTime() + 10 * 3600e3 });
    expect(perfectMonths(ws, 2, NOW)).toBe(1);
    expect(perfectMonths(ws, 4, NOW)).toBe(0);
  });
});

describe('milestones', () => {
  const body = [{ id: 'x', date: NOW - 30 * DAY, weight: 80 }];
  it('strength is self-relative by default: e1RM growth on the lifts you train', () => {
    const ws = [W(30, [['hip-thrust', [[60, 10]]]], { }), W(20, [['hip-thrust', [[70, 10]]]]), W(10, [['hip-thrust', [[80, 10]]]])].map((w) => ({ ...w, exercises: w.exercises.map((e) => ({ ...e, name: 'Hip Thrust' })) }));
    const list = milestones(ws, { now: NOW });
    const lift = list.find((m) => m.id === 'lift:hip-thrust');
    expect(lift).toMatchObject({ group: 'strength', lift: 'Hip Thrust', tier: 1 }); // základ = lepší z prvních 2 (70 kg) → +14 %
    expect(list.find((m) => m.id === 'bench')).toBeUndefined(); // poměr k váze jen na přání
  });
  it('auto lifts: compound only, big three first, at most 4', () => {
    const names = { 'lateral-raise-dumbbell': 'Lateral Raise (Dumbbell)', 'hip-thrust': 'Hip Thrust', 'leg-press': 'Leg Press (Machine)', 'lat-pulldown-cable': 'Lat Pulldown (Cable)', 'seated-row-cable': 'Seated Row (Cable)', squat: 'Squat' };
    const keys = Object.keys(names);
    const mk = (d) => ({ ...W(d), exercises: keys.map((k) => ({ key: k, name: names[k], sets: [{ weight: 40, reps: 8 }] })) });
    const ws = [mk(9), mk(5)];
    const lifts = milestones(ws, { now: NOW }).filter((m) => m.id.startsWith('lift:'));
    expect(lifts).toHaveLength(4);
    expect(lifts[0].id).toBe('lift:squat');
    expect(lifts.some((m) => m.id === 'lift:lateral-raise-dumbbell')).toBe(false);
    expect(lifts[0].few).toBe(true);
  });
  it('own lift selection wins (order kept, isolation allowed)', () => {
    const ws = [W(9, [['squat', [[60, 5]]], ['curl', [[15, 10]]]]), W(5, [['squat', [[60, 5]]], ['curl', [[15, 10]]]])];
    const lifts = milestones(ws, { now: NOW, lifts: ['curl'] }).filter((m) => m.id.startsWith('lift:'));
    expect(lifts.map((m) => m.id)).toEqual(['lift:curl']);
    expect(liftCandidates(ws).map((x) => x.key)).toEqual(['squat', 'curl']);
  });
  it('bodyweight benchmark (opt-in): e1RM up to 10 reps vs 90-day average, men vs women', () => {
    const ws = [W(1, [['bench-press-barbell', [[75, 5], [100, 1]]]])];
    const men = milestones(ws, { body, now: NOW, scale: 'men' }).find((m) => m.id === 'bench');
    expect(men.value).toBeCloseTo(100 / 80); // single 100 = e1RM 100 > 75 × 5 (87,5)
    expect(men.tier).toBe(4);
    const women = milestones(ws, { body, now: NOW, scale: 'women' }).find((m) => m.id === 'bench');
    expect(women.tier).toBe(5);
  });
  it('weight loss never raises the benchmark (highest 90-day average of the last year)', () => {
    const ws = [W(1, [['bench-press-barbell', [[80, 3]]]])];
    const b1 = [{ date: NOW - 60 * DAY, weight: 90 }, { date: NOW - 2 * DAY, weight: 70 }];
    const m = milestones(ws, { body: b1, now: NOW, scale: 'men' }).find((x) => x.id === 'bench');
    expect(m.best.bw).toBeCloseTo(90);
    // big three: stejné zvednutí, váha 100 → 90 kg → stupeň se nezvedne
    const big = [W(30, [['bench-press-barbell', [[60, 5]]], ['squat', [[80, 5]]], ['deadlift', [[100, 5]]]])];
    const heavy = [{ date: NOW - 200 * DAY, weight: 100 }, { date: NOW - 100 * DAY, weight: 100 }];
    const light = [...heavy, { date: NOW - 60 * DAY, weight: 90 }, { date: NOW - 5 * DAY, weight: 90 }];
    const a = milestones(big, { body: heavy, now: NOW, scale: 'men' }).find((x) => x.id === 'total');
    const b = milestones(big, { body: light, now: NOW, scale: 'men' }).find((x) => x.id === 'total');
    expect(b.value).toBeLessThanOrEqual(a.value + 1e-9);
    expect(b.tier).toBe(a.tier);
  });
  it('warm-up sets do not count', () => {
    const ws = [{ ...W(1), exercises: [{ key: 'squat', name: 'Squat', sets: [{ weight: 200, reps: 1, warm: true }, { weight: 50, reps: 5 }] }] }];
    expect(milestones(ws, { body, now: NOW, scale: 'men' }).find((m) => m.id === 'squat').tier).toBe(0);
  });
  it('bodyweight benchmarks are never offered as the closest milestone', () => {
    const list = milestones([W(1, [['bench-press-barbell', [[60, 5]]]])], { now: NOW, body, scale: 'men' });
    expect(closestMilestone(list)?.id).not.toBe('bench');
  });
  it('workouts, records, level ups, explorer; no “hot session”', () => {
    const ws = [
      W(40, [['a', [[50, 5]]], ['b', [[20, 8]]], ['c', [[10, 10]]]], { startedAt: new Date(2026, 7, 20, 6, 30).getTime() }),
      W(2, [['a', [[55, 5]]], ['b', [[22, 8]]], ['c', [[12, 10]]]]),
    ];
    const by = Object.fromEntries(milestones(ws, { now: NOW }).map((m) => [m.id, m]));
    expect(by.workouts.value).toBe(2);
    expect(by.prs.value).toBe(3);
    expect(by.hot).toBeUndefined();
    expect(by.levelup.value).toBe(3);
    expect(by.explorer.value).toBe(3);
  });
  it('big three total vs 90-day average bodyweight, flagged when a lift is missing', () => {
    const ws = [W(2, [['bench-press-barbell', [[80, 1]]], ['squat', [[100, 1]]], ['deadlift', [[140, 1]]]])];
    const t = milestones(ws, { body, now: NOW, scale: 'men' }).find((m) => m.id === 'total');
    expect(t.value).toBeCloseTo(4); // 320 / 80
    expect(t.tier).toBe(4);
    expect(milestones([W(2, [['squat', [[100, 1]]]])], { body, now: NOW, scale: 'men' }).find((m) => m.id === 'total').missing).toBe(true);
  });
  it('growth: e1RM % vs first session, needs 3 sessions', () => {
    const ws = [W(30, [['row', [[50, 10]]]]), W(20, [['row', [[55, 10]]]]), W(10, [['row', [[60, 10]]]])];
    const g = milestones(ws, { now: NOW }).find((m) => m.id === 'growth');
    expect(Math.round(g.value)).toBe(20);
    expect(g.lift).toBe('row');
    expect(milestones(ws.slice(0, 2), { now: NOW }).find((m) => m.id === 'growth').value).toBe(0);
  });
  it('heat milestones: steady flame and forged from training at the goal', () => {
    const ws = weekly([0, 2, 4], 20);
    const by = Object.fromEntries(milestones(ws, { now: NOW, goal: 3 }).map((m) => [m.id, m]));
    expect(by.steady.value).toBeGreaterThanOrEqual(80);
    expect(by.forged.value).toBeGreaterThan(60);
    expect(by.rekindled.value).toBe(0);
  });
  it('comeback: every return after 7+ days', () => {
    const ws = [W(60), W(58), W(40), W(39), W(20)];
    expect(milestones(ws, { now: NOW, goal: 3 }).find((m) => m.id === 'rekindled').value).toBe(2);
    // pauza se do mezery nepočítá
    const breaks = [{ kind: 'pause', from: NOW - 38 * DAY, to: NOW - 21 * DAY }];
    expect(milestones(ws, { now: NOW, goal: 3, breaks }).find((m) => m.id === 'rekindled').value).toBe(1);
  });
  it('secret milestones: no “three in a row”, full week, fresh start', () => {
    const by = Object.fromEntries(milestones([W(1), W(2), W(3)], { now: NOW }).map((m) => [m.id, m]));
    expect(by.triple).toBeUndefined();
    expect(by.fullweek.tier).toBe(0);
    expect(milestones(Array.from({ length: 7 }, (_, i) => W(i)), { now: NOW }).find((m) => m.id === 'fullweek').tier).toBe(1);
    const jan = { ...W(0), startedAt: new Date(2026, 0, 5, 18).getTime() };
    expect(milestones([jan], { now: NOW }).find((m) => m.id === 'newyear')).toMatchObject({ tier: 1, secret: true });
  });
  it('demo data produce sensible milestones', () => {
    const d = generateDemo(NOW);
    const list = milestones(d.workouts, { body: d.body, groups: ['PUSH', 'PULL', 'LEGS'], goal: 3, now: NOW });
    expect(list.find((m) => m.id === 'workouts').tier).toBeGreaterThanOrEqual(1);
    expect(list.some((m) => m.id.startsWith('lift:'))).toBe(true);
    expect(list.every((m) => m.pct >= 0 && m.pct <= 1)).toBe(true);
  });
});

describe('records and “within reach”', () => {
  const hist = [W(5, [['bench', [[80, 8], [85, 6]]]])];
  const st = liftStats(hist).get('bench');
  const pb = { weight: 85, reps: 6 };
  const ex = (sets) => ({ key: 'bench', sets: sets.map(([weight, reps, done], i) => ({ id: 's' + i, weight, reps, done })) });
  it('target itself is a record → hint “record” at the target', () => {
    expect(reachHint(ex([[85, 7]]), pb, st, { weight: 85, reps: 7 })).toMatchObject({ kind: 'pb', weight: 85, reps: 7, atTarget: true });
  });
  it('+1 rep over the target', () => {
    // e1 = 85 × 1,2 = 102; 80 × 9 = 104 → +1 nad cíl 80 × 8
    expect(reachHint(ex([[80, 8]]), pb, { ...st, rm: [] }, { weight: 80, reps: 8 })).toMatchObject({ kind: 'e1', reps: 9, atTarget: false });
  });
  it('never a hint when the target says hold / reset / light week, never a heavier single', () => {
    expect(reachHint(ex([[85, 6]]), pb, st, { weight: 85, reps: 6, hold: true })).toBeNull();
    expect(reachHint(ex([[76.5, 6]]), pb, st, { weight: 76.5, reps: 6, state: 'reset' })).toBeNull();
    expect(reachHint(ex([[90, 1]]), pb, st, { weight: 85, reps: 7 })).toBeNull(); // naťukaná vyšší váha ≠ cíl
  });
  it('nothing open → null', () => expect(reachHint(ex([[85, 6, true]]), pb, st, { weight: 85, reps: 7 })).toBeNull());
  it('setRecord kinds: e1 only up to 10 reps, rep record = heavier for the same reps', () => {
    expect(setRecord({ weight: 85, reps: 7 }, pb, st)).toBe('pb');
    expect(setRecord({ weight: 80, reps: 9 }, pb, st)).toBe('e1');
    expect(setRecord({ weight: 70, reps: 15 }, pb, st)).toBeNull(); // e1 z 15 opakování se nepočítá
    const st2 = liftStats([W(5, [['x', [[60, 12], [100, 3]]]])]).get('x');
    expect(setRecord({ weight: 62.5, reps: 12 }, { weight: 100, reps: 3 }, st2)).toBe('reps');
    expect(setRecord({ weight: 50, reps: 12 }, { weight: 100, reps: 3 }, st2)).toBeNull(); // víc opakování s lehčí váhou už rekord není
    expect(setRecord({ weight: 90, reps: 5, warm: true }, pb, st)).toBeNull();
  });
});

describe('month recap', () => {
  it('counts the month and finds the best lift and jump', () => {
    const sep = (d, w) => ({ ...W(0), startedAt: new Date(2026, 8, d, 18).getTime(), exercises: [{ key: 'squat', name: 'Squat', sets: [{ weight: w, reps: 5 }] }] });
    const ws = [{ ...sep(1, 0), startedAt: new Date(2026, 7, 25, 18).getTime(), exercises: [{ key: 'squat', name: 'Squat', sets: [{ weight: 100, reps: 5 }] }] }, sep(3, 105), sep(10, 110)];
    const r = monthRecap(ws, { month: new Date(2026, 8, 15).getTime(), goal: 1, now: NOW });
    expect(r.workouts).toBe(2);
    expect(r.records).toBe(2);
    expect(r.best).toMatchObject({ name: 'Squat', weight: 110, reps: 5 });
    expect(r.jump.name).toBe('Squat');
    expect(r.heat).toHaveLength(30);
    expect(r.weeksKept).toBeGreaterThanOrEqual(r.weeksMet);
  });
});

describe('milestone detail', () => {
  it('tierDates: day each tier was first reached', async () => {
    const { tierDates } = await import('./gamify.js');
    const NOW2 = new Date(2026, 9, 3, 18).getTime();
    const ws = Array.from({ length: 12 }, (_, i) => ({ id: 'x' + i, name: 'W', startedAt: NOW2 - (60 - i * 5) * 864e5, finishedAt: NOW2 - (60 - i * 5) * 864e5 + 1, exercises: [] }));
    const d = tierDates(ws, 'workouts', { now: NOW2 });
    expect(d).toHaveLength(1); // 12 tréninků → úroveň I (10)
    const tenth = new Date(ws[9].startedAt); tenth.setHours(0, 0, 0, 0);
    expect(d[0]).toBe(tenth.getTime());
  });
  it('only: computes a single milestone (also a self lift)', () => {
    const list = milestones([W(1, [['bench-press-barbell', [[80, 3]]]])], { now: NOW, only: 'bench', scale: 'men', body: [{ date: NOW - 5 * DAY, weight: 80 }] });
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: 'bench', best: { kg: 80, reps: 3, bw: 80 } });
    const ws = [W(30, [['row', [[50, 10]]]]), W(20, [['row', [[55, 10]]]]), W(10, [['row', [[60, 10]]]])];
    const one = milestones(ws, { now: NOW, only: 'lift:row' });
    expect(one).toHaveLength(1);
    expect(one[0].id).toBe('lift:row');
  });
});
