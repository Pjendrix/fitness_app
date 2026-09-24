import { describe, expect, it } from 'vitest';
import { nextTarget, recordsTimeline, repRange } from './progress.js';
import { templateDiffers, templateFromActive } from './templateSync.js';
import { platesFor } from '../components/PlateCalc.jsx';

describe('repRange', () => {
  it('single number → double progression +2', () => expect(repRange('8')).toEqual({ lo: 8, hi: 10 }));
  it('explicit range', () => expect(repRange('6-8')).toEqual({ lo: 6, hi: 8 }));
  it('max / pyramid → null', () => { expect(repRange('max')).toBeNull(); expect(repRange('pyramid')).toBeNull(); });
});

describe('nextTarget', () => {
  it('+1 rep below the top of the range', () => expect(nextTarget({ weight: 85, reps: 6 }, '6')).toEqual({ weight: 85, reps: 7 }));
  it('+weight and back to the bottom at the top', () => expect(nextTarget({ weight: 85, reps: 8 }, '6')).toEqual({ weight: 87.5, reps: 6 }));
  it('small dumbbells step 0.5 kg', () => expect(nextTarget({ weight: 8, reps: 10 }, '8')).toEqual({ weight: 8.5, reps: 8 }));
  it('no template → 8–12', () => expect(nextTarget({ weight: 40, reps: 12 }, undefined)).toEqual({ weight: 42.5, reps: 8 }));
  it('bodyweight / max → +1 rep', () => {
    expect(nextTarget({ weight: 0, reps: 10 }, '8')).toEqual({ weight: 0, reps: 11 });
    expect(nextTarget({ weight: 20, reps: 10 }, 'max')).toEqual({ weight: 20, reps: 11 });
  });
  it('timed → none', () => expect(nextTarget({ weight: 0, reps: 0, time: 5 }, '')).toBeNull());
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
