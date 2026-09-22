import { describe, expect, it } from 'vitest';
import { better, countUnchecked, DECIMAL_INPUT, exKey, INT_INPUT, num, sanitizeName, sanitizeSet } from './util.js';
import { parseCsv, toCsv } from './csv.js';

describe('util', () => {
  it('num parses comma decimals', () => {
    expect(num('82,5')).toBe(82.5);
    expect(num('abc')).toBe(0);
  });
  it('sanitizeSet clamps negative and absurd values', () => {
    expect(sanitizeSet({ weight: '-5', reps: '8' }, false)).toEqual({ weight: 0, reps: 8 });
    expect(sanitizeSet({ weight: '9999', reps: '7.6' }, false)).toEqual({ weight: 500, reps: 8 });
    expect(sanitizeSet({ weight: '0', time: '1000' }, true)).toEqual({ weight: 0, reps: 0, time: 600 });
  });
  it('sanitizeName trims, collapses and limits length', () => {
    expect(sanitizeName('  Bench   Press ')).toBe('Bench Press');
    expect(sanitizeName('x'.repeat(200))).toHaveLength(80);
  });
  it('input patterns', () => {
    expect(DECIMAL_INPUT.test('82,5')).toBe(true);
    expect(DECIMAL_INPUT.test('-5')).toBe(false);
    expect(DECIMAL_INPUT.test('1000')).toBe(false);
    expect(INT_INPUT.test('12')).toBe(true);
    expect(INT_INPUT.test('1.5')).toBe(false);
  });
  it('better: weight wins, reps break ties', () => {
    expect(better({ weight: 100, reps: 1 }, { weight: 95, reps: 10 })).toBe(true);
    expect(better({ weight: 100, reps: 5 }, { weight: 100, reps: 6 })).toBe(false);
    expect(better({ weight: 100, reps: 0 }, null)).toBe(false);
  });
  it('countUnchecked counts filled but unticked sets', () => {
    const a = { exercises: [{ type: 'reps', sets: [{ reps: '8', done: false }, { reps: '8', done: true }, { reps: '', done: false }] }] };
    expect(countUnchecked(a)).toBe(1);
  });
  it('exKey normalises diacritics', () => {
    expect(exKey('Bench Press (Barbell)')).toBe('bench-press-barbell');
  });
});

describe('csv', () => {
  it('round-trips and guards formula injection', () => {
    const out = toCsv([['name', 'category'], ['=HYPERLINK("x")', 'chest'], ['Row, cable', 'back']]);
    expect(out).toContain(`"'=HYPERLINK(""x"")"`);
    const rows = parseCsv(out);
    expect(rows[2]).toEqual(['Row, cable', 'back']);
  });
});
