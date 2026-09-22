import { describe, expect, it } from 'vitest';
import { applyChanges, applyWorkout, bestSet, changesAfterDelete } from './records.js';

const w = (id, finishedAt, sets, key = 'bench') => ({ id, finishedAt, exercises: [{ key, name: 'Bench', sets }] });

describe('records', () => {
  it('applyWorkout sets first PR without counting it as beaten', () => {
    const r = applyWorkout(w('a', 1, [{ weight: 80, reps: 5 }]), {});
    expect(r.next.bench).toMatchObject({ weight: 80, reps: 5, date: 1 });
    expect(r.beaten).toBe(0);
  });
  it('counts a beaten exercise once even with several better sets', () => {
    const prs = { bench: { weight: 80, reps: 5, name: 'Bench', date: 1 } };
    const r = applyWorkout(w('b', 2, [{ weight: 82.5, reps: 5 }, { weight: 85, reps: 3 }]), prs);
    expect(r.next.bench.weight).toBe(85);
    expect(r.beaten).toBe(1);
  });
  it('deleting the workout that holds the PR recomputes it from the rest', () => {
    const a = w('a', 1, [{ weight: 80, reps: 5 }]);
    const typo = w('b', 2, [{ weight: 1000, reps: 5 }]);
    const prs = applyWorkout(typo, applyWorkout(a, {}).next).next;
    expect(prs.bench.weight).toBe(1000);
    const ch = changesAfterDelete(typo, [a], prs);
    expect(applyChanges(prs, ch).bench.weight).toBe(80);
  });
  it('deleting the only workout removes the PR', () => {
    const a = w('a', 1, [{ weight: 80, reps: 5 }]);
    const prs = applyWorkout(a, {}).next;
    const ch = changesAfterDelete(a, [], prs);
    expect(ch).toEqual({ bench: null });
    expect(applyChanges(prs, ch)).toEqual({});
  });
  it('deleting an unrelated workout changes nothing', () => {
    const a = w('a', 1, [{ weight: 100, reps: 5 }]);
    const b = w('b', 2, [{ weight: 80, reps: 5 }]);
    const prs = applyWorkout(b, applyWorkout(a, {}).next).next;
    expect(changesAfterDelete(b, [a], prs)).toEqual({});
  });
  it('timed sets: longer time wins', () => {
    expect(bestSet([w('a', 1, [{ weight: 0, reps: 0, time: 2 }, { weight: 0, reps: 0, time: 3 }], 'plank')], 'plank').time).toBe(3);
  });
});

import { recomputeKeys } from './records.js';
describe('recomputeKeys (edit)', () => {
  it('lowers PR after editing a typo and keeps unchanged keys out', () => {
    const a = w('a', 1, [{ weight: 80, reps: 5 }]);
    const typo = w('b', 2, [{ weight: 1000, reps: 5 }]);
    const prs = applyWorkout(typo, applyWorkout(a, {}).next).next;
    const fixed = { ...typo, exercises: [{ key: 'bench', name: 'Bench', sets: [{ weight: 85, reps: 5 }] }] };
    const ch = recomputeKeys(['bench'], [fixed, a], prs);
    expect(ch.bench).toMatchObject({ weight: 85, date: 2 });
    expect(recomputeKeys(['bench'], [fixed, a], applyChanges(prs, ch))).toEqual({});
  });
  it('tie keeps the first date', () => {
    const a = w('a', 1, [{ weight: 80, reps: 5 }]), b = w('b', 2, [{ weight: 80, reps: 5 }]);
    expect(recomputeKeys(['bench'], [b, a], {}).bench.date).toBe(1);
  });
});
