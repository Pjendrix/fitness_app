import { describe, expect, it } from 'vitest';
import { defaultStep, deloadAdvice, exerciseTargets, isStalled, learnedSteps, lighterLoad, recordsTimeline, repRange, rirTarget, widenRange } from './progress.js';
import { templateDiffers, templateFromActive } from './templateSync.js';
import { platesFor } from '../components/PlateCalc.jsx';

describe('repRange', () => {
  it('up to 6 reps → +2', () => expect(repRange('6')).toEqual({ lo: 6, hi: 8 }));
  it('8+ reps → +4', () => expect(repRange('8')).toEqual({ lo: 8, hi: 12 }));
  it('explicit top from the template', () => expect(repRange('8', 10)).toEqual({ lo: 8, hi: 10 }));
  it('written range', () => expect(repRange('6-8')).toEqual({ lo: 6, hi: 8 }));
  it('max / pyramid → null', () => { expect(repRange('max')).toBeNull(); expect(repRange('pyramid')).toBeNull(); });
});

describe('exerciseTargets (double progression with brakes)', () => {
  const prev = (list) => list.map(([weight, reps, rpe]) => ({ weight, reps, ...(rpe ? { rpe } : {}) }));
  it('machine 3× 8 with a big relative step: +1 rep, range widened (no jump yet)', () => {
    expect(exerciseTargets(prev([[10, 10], [15, 10], [20, 10]]), { spec: '8', step: 5 }))
      .toEqual([{ weight: 10, reps: 11 }, { weight: 15, reps: 11 }, { weight: 20, reps: 11 }]);
  });
  it('sets at the top hold while others catch up', () => {
    expect(exerciseTargets(prev([[60, 12], [60, 10]]), { spec: '8', step: 2.5 }))
      .toEqual([{ weight: 60, reps: 12, hold: true }, { weight: 60, reps: 11 }]);
  });
  it('all sets at the top → + step, back to the bottom', () => {
    expect(exerciseTargets(prev([[60, 12], [60, 12]]), { spec: '8', step: 2.5 }))
      .toEqual([{ weight: 62.5, reps: 8, state: 'up' }, { weight: 62.5, reps: 8, state: 'up' }]);
  });
  it('barbell 4× 6 → 6–8, step 2.5', () => {
    expect(exerciseTargets(prev([[85, 8], [85, 8]]), { spec: '6', step: 2.5 })).toEqual([{ weight: 87.5, reps: 6, state: 'up' }, { weight: 87.5, reps: 6, state: 'up' }]);
  });
  it('light dumbbells: step > 25 % of the weight → more reps first (12 → 18)', () => {
    expect(widenRange({ lo: 8, hi: 12 }, 3, 2)).toEqual({ lo: 8, hi: 18, wide: true });
    expect(widenRange({ lo: 8, hi: 12 }, 12, 2)).toEqual({ lo: 8, hi: 15, wide: true });
    expect(widenRange({ lo: 8, hi: 12 }, 60, 2.5)).toEqual({ lo: 8, hi: 12 });
    expect(widenRange({ lo: 15, hi: 15 }, 3, 2)).toEqual({ lo: 15, hi: 20, wide: true }); // nejvýš do 20
    expect(exerciseTargets(prev([[3, 12], [3, 12]]), { spec: '8', step: 2 })).toEqual([{ weight: 3, reps: 13 }, { weight: 3, reps: 13 }]);
  });
  it('top of the range but RPE 10 → hold and confirm before adding weight', () => {
    expect(exerciseTargets(prev([[60, 12, 10], [60, 12]]), { spec: '8', step: 2.5 })[0]).toMatchObject({ weight: 60, reps: 12, hold: true, state: 'verify' });
  });
  it('last time RPE 10 below the top → hold (no +1)', () => {
    expect(exerciseTargets(prev([[60, 9, 10], [60, 8]]), { spec: '8', step: 2.5 })).toEqual([
      { weight: 60, reps: 9, hold: true, state: 'easy' }, { weight: 60, reps: 8, hold: true, state: 'easy' },
    ]);
  });
  it('a normal weight step is not a stall (60×12 → 62.5×8/9/10)', () => {
    const s0 = prev([[62.5, 10]]);
    const recent = [s0, prev([[62.5, 9]]), prev([[62.5, 8]]), prev([[60, 12]])];
    expect(isStalled(recent)).toBe(false);
    expect(exerciseTargets(s0, { spec: '8', step: 2.5, recent })[0]).toEqual({ weight: 62.5, reps: 11 });
  });
  it('“2 for 2”: without RPE the top of the range must be hit twice in a row', () => {
    const s0 = prev([[60, 12], [60, 12]]);
    expect(exerciseTargets(s0, { spec: '8', step: 2.5, recent: [s0, prev([[60, 11], [60, 10]])] })[0]).toMatchObject({ weight: 60, state: 'verify' });
    expect(exerciseTargets(s0, { spec: '8', step: 2.5, recent: [s0, prev([[60, 12], [60, 12]])] })[0]).toMatchObject({ weight: 62.5, state: 'up' });
    // s RPE ≤ 9 stačí jeden trénink
    expect(exerciseTargets(prev([[60, 12, 8], [60, 12, 8]]), { spec: '8', step: 2.5, recent: [s0, prev([[60, 10]])] })[0]).toMatchObject({ state: 'up' });
  });
  it('lighterLoad: always at least one step lighter, never more than ~20 %', () => {
    expect(lighterLoad(80, 8, 2.5, 0.875)).toEqual({ weight: 70, reps: 8 });
    expect(lighterLoad(20, 10, 5, 0.875)).toEqual({ weight: 20, reps: 7, fewer: true });
    expect(lighterLoad(30, 10, 5, 0.9)).toEqual({ weight: 25, reps: 10 });
    expect(lighterLoad(40, 10, 5, 0.875)).toEqual({ weight: 35, reps: 10 });
  });
  it('stalled 3 sessions → reset about −10 %', () => {
    const s = prev([[60, 8], [60, 8]]);
    const t = exerciseTargets(s, { spec: '8', step: 2.5, recent: [s, s, s, s] });
    expect(t[0]).toMatchObject({ weight: 55, reps: 8, state: 'reset' });
    expect(isStalled([s, s, s])).toBe(false); // potřeba 4 tréninky
  });
  it('light week, “light weights” mode → about −12.5 %, same reps', () => {
    expect(exerciseTargets(prev([[80, 8]]), { spec: '8', step: 2.5, deload: 'light' })).toEqual([{ weight: 70, reps: 8, hold: true, state: 'deload' }]);
  });
  it('light week → same weights and reps, no progression', () => {
    expect(exerciseTargets(prev([[60, 12], [60, 12]]), { spec: '8', step: 2.5, deload: true })).toEqual([
      { weight: 60, reps: 12, hold: true, state: 'deload' }, { weight: 60, reps: 12, hold: true, state: 'deload' },
    ]);
  });
  it('pyramid with a final “max” set: the heaviest ranged set decides, max does not block', () => {
    const t = exerciseTargets(prev([[60, 14], [70, 12], [80, 8], [85, 9]]), { specs: [10, 8, 6, 'max'], step: 2.5 });
    expect(t.slice(0, 3).every((x) => x.state === 'up')).toBe(true);
    expect(t[3]).toEqual({ weight: 85, reps: 10 });
  });
  it('bodyweight / max → +1 rep, with a cap', () => {
    expect(exerciseTargets(prev([[0, 10]]), { spec: '8' })).toEqual([{ weight: 0, reps: 11 }]);
    expect(exerciseTargets(prev([[0, 20]]), { spec: '8' })).toEqual([{ weight: 0, reps: 20, hold: true, state: 'load' }]);
    expect(exerciseTargets(prev([[20, 10]]), { spec: 'max' })).toEqual([{ weight: 20, reps: 11 }]);
    expect(exerciseTargets(prev([[20, 15]]), { spec: 'max' })).toEqual([{ weight: 20, reps: 15, hold: true, state: 'cap' }]);
  });
  it('timed → none', () => expect(exerciseTargets([{ weight: 0, reps: 0, time: 5 }], { spec: '' })).toEqual([null]));
  it('RIR target by exercise type', () => {
    expect(rirTarget('Bench Press (Barbell)')).toBe('2–3');
    expect(rirTarget('Squat')).toBe('2–3');
    expect(rirTarget('Lat Pulldown (Cable)')).toBe('1–2');
    expect(rirTarget('Machine Chest Press')).toBe('1–2');
    expect(rirTarget('Chest Press (Machine)')).toBe('1–2');
    expect(rirTarget('Seated Cable Row')).toBe('1–2');
    expect(rirTarget('Leg Press')).toBe('1–2');
    expect(rirTarget('Cable RDL')).toBe('1–2');
    expect(rirTarget('Lateral Raise (Dumbbell)')).toBe('0–2');
    expect(rirTarget('Leg Extension (Machine)')).toBe('0–2');
    expect(rirTarget('Triceps Pushdown (Cable)')).toBe('0–2');
  });
});

describe('deloadAdvice', () => {
  const DAY = 864e5, NOW = new Date(2026, 9, 3, 18).getTime();
  const w = (daysAgo, ex = []) => ({ id: 'd' + daysAgo, startedAt: NOW - daysAgo * DAY, exercises: ex });
  it('8+ weeks of steady training without a break → suggest', () => {
    const ws = Array.from({ length: 30 }, (_, i) => w(i * 2 + 1));
    expect(deloadAdvice(ws, { goal: 3, now: NOW })).toMatchObject({ reason: 'weeks' });
    expect(deloadAdvice(ws, { goal: 3, now: NOW, breaks: [{ kind: 'deload', from: NOW - 20 * DAY, to: NOW - 13 * DAY }] })).toBeNull();
  });
  it('performance drop on 2 exercises at the same weight → suggest', () => {
    const ex = (ra, rb) => [{ key: 'a', sets: [{ weight: 100, reps: ra }] }, { key: 'b', sets: [{ weight: 50, reps: rb }] }];
    const ws = [w(9, ex(8, 10)), w(5, ex(6, 10)), w(2, ex(6, 8))];
    expect(deloadAdvice(ws, { goal: 3, now: NOW })).toEqual({ reason: 'drop', n: 2 });
  });
  it('a weight step-up or a reset is not a drop', () => {
    const ex = (wa, ra, wb, rb) => [{ key: 'a', sets: [{ weight: wa, reps: ra }] }, { key: 'b', sets: [{ weight: wb, reps: rb }] }];
    const ws = [w(9, ex(100, 12, 50, 12)), w(5, ex(102.5, 8, 52.5, 8)), w(2, ex(92.5, 8, 47.5, 8))];
    expect(deloadAdvice(ws, { goal: 3, now: NOW })).toBeNull();
  });
  it('nothing while paused', () => {
    const ws = Array.from({ length: 30 }, (_, i) => w(i * 2 + 1));
    expect(deloadAdvice(ws, { goal: 3, now: NOW, breaks: [{ kind: 'pause', from: NOW - DAY, to: null }] })).toBeNull();
  });
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
      w('e', 5, [{ weight: 50, reps: 20 }]), // e1 z 20 opakování se nepočítá
      w('f', 6, [{ weight: 82.5, reps: 5 }]), // těžší na 5 opakování → rekord opakování
    ]);
    expect(r.get('a')).toBeUndefined();
    expect(r.get('b')[0].kind).toBe('pb');
    expect(r.get('c')[0].kind).toBe('e1');
    expect(r.get('d')).toBeUndefined();
    expect(r.get('e')).toBeUndefined();
    expect(r.get('f')[0].kind).toBe('reps');
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
