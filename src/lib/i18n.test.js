import { beforeEach, describe, expect, it } from 'vitest';

const store = {};
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
globalThis.document = { documentElement: {} };
const { setLang, t } = await import('./i18n.js');

describe('i18n plurals', () => {
  beforeEach(() => setLang('cs'));
  it('czech forms', () => {
    expect(t('count.sets', { n: 1 })).toBe('1 série');
    expect(t('count.sets', { n: 3 })).toBe('3 série');
    expect(t('count.sets', { n: 5 })).toBe('5 sérií');
    expect(t('hist.month', { n: 2 })).toBe('2 tréninky tento měsíc');
  });
  it('english forms', () => {
    setLang('en');
    expect(t('count.sets', { n: 1 })).toBe('1 set');
    expect(t('count.sets', { n: 4 })).toBe('4 sets');
  });
});
