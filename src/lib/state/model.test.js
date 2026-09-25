import { describe, expect, it } from 'vitest';
import { keepExercises, normalizeExercise, normalizeImported, renameInTemplate, renameInWorkouts } from './model.js';

describe('normalizeExercise', () => {
  it('zachová poznámku, RPE i superset a vyhodí prázdné série', () => {
    const e = normalizeExercise({ key: 'bench', name: '  Bench  Press ', note: 'úchop', rpe: '8', ss: 'abc', sets: [{ weight: '80', reps: '5' }, { weight: '80', reps: '' }] });
    expect(e).toEqual({ key: 'bench', name: 'Bench Press', sets: [{ weight: 80, reps: 5 }], note: 'úchop', rpe: 8, ss: 'abc' });
  });
  it('RPE mimo 1–10 zahodí, klíč dopočítá z názvu', () => {
    const e = normalizeExercise({ name: 'Plank', type: 'time', rpe: 42, sets: [{ weight: 0, time: '1.5' }] });
    expect(e.key).toBe('plank');
    expect(e.rpe).toBeUndefined();
    expect(e.sets).toEqual([{ weight: 0, reps: 0, time: 1.5 }]);
  });
  it('keepExercises vynechá cviky bez sérií', () => {
    expect(keepExercises([{ name: 'A', sets: [] }, { name: 'B', sets: [{}] }]).map((e) => e.name)).toEqual(['B']);
  });
});

describe('normalizeImported', () => {
  it('odmítne nevalidní a opraví časy', () => {
    expect(normalizeImported({ id: 1 }, 'x')).toBeNull();
    const w = normalizeImported({ id: 'w1', startedAt: 100.4, finishedAt: 50, exercises: [{ name: 'Squat', sets: [{ weight: 100, reps: 5 }] }] }, 'Workout');
    expect(w).toMatchObject({ id: 'w1', name: 'Workout', startedAt: 100, finishedAt: 100 });
    expect(w.exercises[0].key).toBe('squat');
  });
});

describe('renameInWorkouts (A3)', () => {
  const w = (id, ...ex) => ({ id, exercises: ex });
  const e = (key, name, n, note) => ({ key, name, sets: Array.from({ length: n }, (_, i) => ({ weight: 10, reps: i + 1 })), ...(note ? { note } : {}) });
  it('přejmenuje a vrátí jen změněné tréninky', () => {
    const { list, changed } = renameInWorkouts([w('a', e('chest-fly', 'Chest Fly', 2)), w('b', e('squat', 'Squat', 1))], 'chest-fly', 'Pec Deck');
    expect(changed.map((x) => x.id)).toEqual(['a']);
    expect(list[0].exercises[0]).toMatchObject({ key: 'pec-deck', name: 'Pec Deck' });
    expect(list[1]).toBe(list[1]);
  });
  it('sloučí se stejným cvikem v tréninku (série i poznámky)', () => {
    const { list } = renameInWorkouts([w('a', e('pec-deck', 'Pec Deck', 1, 'A'), e('squat', 'Squat', 1), e('chest-fly', 'Chest Fly', 2, 'B'))], 'chest-fly', 'Pec Deck');
    expect(list[0].exercises.map((x) => x.key)).toEqual(['pec-deck', 'squat']);
    expect(list[0].exercises[0].sets).toHaveLength(3);
    expect(list[0].exercises[0].note).toBe('A · B');
  });
  it('šablona: přejmenuje jen dotčené', () => {
    expect(renameInTemplate({ exercises: [{ name: 'Squat' }] }, 'chest-fly', 'Pec Deck')).toBeNull();
    expect(renameInTemplate({ exercises: [{ name: 'Chest Fly', sets: 3 }] }, 'chest-fly', 'Pec Deck').exercises[0]).toEqual({ name: 'Pec Deck', sets: 3 });
  });
});
