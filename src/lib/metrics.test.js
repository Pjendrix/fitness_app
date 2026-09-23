import { describe, expect, it } from 'vitest';
import { computeMetrics, previousSame } from './metrics.js';

const w = (id, day, sets, extra = {}) => ({ id, name: 'PUSH', templateId: 'push', startedAt: day * 864e5, finishedAt: day * 864e5 + 50 * 60000, exercises: [{ key: 'bench', name: 'Bench', sets }], ...extra });

describe('metrics', () => {
  it('first session has no intensity, later ones relative to prior best', () => {
    const m = computeMetrics([w('b', 2, [{ weight: 80, reps: 5 }]), w('a', 1, [{ weight: 100, reps: 1 }])]);
    expect(m.get('a').intensity).toBeNull();
    expect(m.get('b').intensity).toBeCloseTo(80);
    expect(m.get('b').volume).toBe(400);
    expect(m.get('b').density).toBeCloseTo(8);
    expect(m.get('b').score).toBeCloseTo(8);
  });
  it('previousSame finds latest earlier workout of same template', () => {
    const list = [w('a', 1, []), w('b', 3, []), w('c', 5, []), w('x', 4, [], { templateId: 'pull' })];
    expect(previousSame(list[2], list).id).toBe('b');
    expect(previousSame(list[0], list)).toBeNull();
  });
});
