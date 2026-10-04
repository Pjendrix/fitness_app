import { describe, expect, it } from 'vitest';
import { activeBreak, cleanBreaks, effTime, pausedBefore, weekExcuse } from './breaks.js';

const DAY = 864e5;
const MON = new Date(2026, 8, 28).getTime(); // po 28. 9. 2026

describe('breaks', () => {
  it('cleanBreaks: drops invalid entries, sorts, keeps open end', () => {
    const list = cleanBreaks([{ kind: 'x', from: 1 }, { kind: 'pause', from: 5, to: 3 }, { kind: 'deload', from: 20, to: 30 }, { kind: 'pause', from: 10, to: null }]);
    expect(list).toEqual([{ kind: 'pause', from: 10, to: null }, { kind: 'deload', from: 20, to: 30 }]);
  });
  it('activeBreak: running pause and deload with a future end', () => {
    const b = [{ kind: 'pause', from: MON, to: null }, { kind: 'deload', from: MON - 10 * DAY, to: MON - 3 * DAY }];
    expect(activeBreak(b, 'pause', MON + DAY)).toBeTruthy();
    expect(activeBreak(b, 'deload', MON + DAY)).toBeNull();
  });
  it('pausedBefore / effTime: time stands still during a pause', () => {
    const b = [{ kind: 'pause', from: MON, to: MON + 5 * DAY }];
    expect(pausedBefore(b, MON + 2 * DAY)).toBe(2 * DAY);
    const eff = effTime(b);
    expect(eff(MON + 6 * DAY) - eff(MON - DAY)).toBe(2 * DAY);
  });
  it('weekExcuse: pause or deload covering 3+ days of the week', () => {
    expect(weekExcuse([{ kind: 'pause', from: MON + 4 * DAY, to: MON + 9 * DAY }], MON)).toBe('pause');
    expect(weekExcuse([{ kind: 'pause', from: MON + 5 * DAY, to: MON + 9 * DAY }], MON)).toBeNull();
    expect(weekExcuse([{ kind: 'deload', from: MON, to: MON + 7 * DAY }], MON)).toBe('deload');
  });
});
