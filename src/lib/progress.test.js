import { describe, expect, it } from 'vitest';
import { defaultStep, exerciseTargets, learnedSteps, recordsTimeline, repRange } from './progress.js';
import { templateDiffers, templateFromActive } from './templateSync.js';
import { platesFor } from '../components/PlateCalc.jsx';

describe('repRange', () => {
  it('up to 6 reps → +2', () => expect(repRange('6')).toEqual({ lo: 6, hi: 8 }));
  it('8+ reps → +4', () => expect(repRange('8')).toEqual({ lo: 8, hi: 12 }));
  it('explicit top from the template', () => expect(repRange('8', 10)).toEqual({ lo: 8, hi: 10 }));
  it('written range', () => expect(repRange('6-8')).toEqual({ lo: 6, hi: 8 }));
  it('max / pyramid → null', () => { expect(repRange('max')).toBeNull(); expect(repRange('pyramid')).toBeNull(); });
});

describe('exerciseTargets (double progression)', () => {
  const prev = (list) => list.map(([weight, reps]) => ({ weight, reps }));
  it('machine 3× 8: at 10 reps → +1 rep, same weight (no 21 kg)', () => {
    expect(exerciseTargets(prev([[10, 10], [15, 10], [20, 10]]), { spec: '8', step: 5 }))
      .toEqual([{ weight: 10, reps: 11 }, { weight: 15, reps: 11 }, { weight: 20, reps: 11 }]);
  });
  it('sets at the top hold while others catch up', () => {
    expect(exerciseTargets(prev([[20, 12], [20, 10]]), { spec: '8', step: 5 }))
      .toEqual([{ weight: 20, reps: 12, hold: true }, { weight: 20, reps: 11 }]);
  });
  it('all sets at the top → + step, back to the bottom', () => {
    expect(exerciseTargets(prev([[20, 12], [20, 12]]), { spec: '8', step: 5 }))
      .toEqual([{ weight: 25, reps: 8 }, { weight: 25, reps: 8 }]);
  });
  it('barbell 4× 6 → 6–8, step 2.5', () => {
    expect(exerciseTargets(prev([[85, 8], [85, 8]]), { spec: '6', step: 2.5 })).toEqual([{ weight: 87.5, reps: 6 }, { weight: 87.5, reps: 6 }]);
  });
  it('bodyweight / max → +1 rep', () => {
    expect(exerciseTargets(prev([[0, 10]]), { spec: '8' })).toEqual([{ weight: 0, reps: 11 }]);
    expect(exerciseTargets(prev([[20, 10]]), { spec: 'max' })).toEqual([{ weight: 20, reps: 11 }]);
  });
  it('timed → none', () => expect(exerciseTargets([{ weight: 0, reps: 0, time: 5 }], { spec: '' })).toEqual([null]));
});

describe('weight steps', () => {
  it('by equipment', () => {
    expect(defaultStep('Shoulder Press (Machine)')).toBe(5);
    expect(defaultStep('Triceps Pushdown (Cable)')).toBe(5);
    expect(defaultStep('Bicep Curl (Dumbbell)')).toBe(2);
    expect(defaultStep('Bench Press (Barbell)')).toBe(2.5);
  });
  it('learned from history', () => {
    const w = [{ exercises: [{ key: 'sp', sets: [{ weight: 10 }, { weight: 15 }, { weight: 20 }] }] }];
    expect(learnedSteps(w).get('sp')).toBe(5);
  });
});

describe('recordsTimeline', () => {
  const w = (id, t, sets) => ({ id, startedAt: t, finishedAt: t + 1, exercises: [{ key: 'bench', name: 'Bench', sets }] });
  it('first time is not a record, then pb / e1 / reps', () => {
    const r = recordsTimeline([
      w('a', 1, [{ weight: 80, reps: 5 }]),
      w('b', 2, [{ weight: 85, reps: 3 }]),
      w('c', 3, [{ weight: 80, reps: 8 }]),
      w('d', 4, [{ weight: 70, reps: 5 }]),
    ]);
    expect(r.get('a')).toBeUndefined();
    expect(r.get('b')[0].kind).toBe('pb');
    expect(r.get('c')[0].kind).toBe('e1');
    expect(r.get('d')).toBeUndefined();
  });
});

describe('templates', () => {
  const tpl = { id: 't', name: 'PUSH', exercises: [{ name: 'Bench Press (Barbell)', sets: 4, reps: '6', plan: [1, 2, 3, 4] }, { name: 'Dips', sets: 3, reps: 'max' }] };
  const act = (sets) => ({ exercises: [{ key: 'bench-press-barbell', name: 'Bench Press (Barbell)', sets: Array.from({ length: sets }, () => ({})) }, { key: 'dips', name: 'Dips', sets: [{}, {}, {}] }] });
  it('detects changed set count', () => { expect(templateDiffers(tpl, act(4))).toBe(false); expect(templateDiffers(tpl, act(5))).toBe(true); });
  it('keeps reps, drops a plan that no longer fits', () => {
    const n = templateFromActive(tpl, act(5));
    expect(n.exercises[0]).toMatchObject({ sets: 5, reps: '6' });
    expect(n.exercises[0].plan).toBeUndefined();
  });
});

describe('platesFor', () => {
  it('100 kg on a 20 kg bar', () => expect(platesFor(100, 20).plates).toEqual([25, 15]));
  it('odd remainder', () => expect(platesFor(61, 20)).toEqual({ plates: [20], rest: 0.5 }));
});
