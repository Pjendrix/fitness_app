import { describe, expect, it } from 'vitest';
import { bodyAt, bodyEntry, bodyTrend, defaultBw, fmtRest, lastSetAt, restOf, setLoad } from './body.js';

const day = (s) => new Date(s + 'T12:00:00').getTime();

describe('tělesná váha (E3)', () => {
  const list = [{ date: day('2026-09-01'), weight: 84 }, { date: day('2026-09-10'), weight: 83 }, { date: day('2026-09-20'), weight: 82.4 }];
  it('bodyAt: poslední záznam do data, jinak nejbližší pozdější', () => {
    expect(bodyAt(list, day('2026-09-15'))).toBe(83);
    expect(bodyAt(list, day('2026-09-20') + 3600000)).toBe(82.4);
    expect(bodyAt(list, day('2026-08-01'))).toBe(84);
    expect(bodyAt([], day('2026-08-01'))).toBeNull();
  });
  it('bodyTrend za 14 dní', () => {
    expect(bodyTrend(list, 14, day('2026-09-24'))).toMatchObject({ now: 82.4, delta: -0.6 });
    expect(bodyTrend([list[0]], 14, day('2026-09-24'))).toMatchObject({ now: 84, delta: null });
  });
  it('bodyEntry: id podle místního dne, váha na 0,1 kg', () => {
    expect(bodyEntry(day('2026-09-27'), '82,46')).toMatchObject({ id: '2026-09-27', weight: 82.5 });
  });
  it('cviky s vlastní vahou', () => {
    expect(defaultBw('Pull-up')).toBe(1);
    expect(defaultBw('Push-up')).toBe(0.65);
    expect(defaultBw('Bench Press (Barbell)')).toBe(0);
    expect(setLoad({ bw: 82 }, { weight: 10 })).toBe(92);
    expect(setLoad({}, { weight: 10 })).toBe(10);
  });
});

describe('časy sérií (E1)', () => {
  const w = (times) => ({ exercises: [{ sets: times.map((at) => ({ at })) }, { sets: [{}] }] });
  it('pauza = medián rozestupů, dlouhé přestávky se nepočítají', () => {
    expect(restOf(w([1e3, 91e3, 211e3, 301e3, 3001e3]))).toBe(90);
    expect(restOf(w([1e3, 61e3]))).toBeNull();
  });
  it('poslední série a formát', () => {
    expect(lastSetAt(w([5, 1, 9]))).toBe(9);
    expect(lastSetAt(w([]))).toBeNull();
    expect(fmtRest(125)).toBe('2:05');
    expect(fmtRest(45)).toBe('45 s');
  });
});
