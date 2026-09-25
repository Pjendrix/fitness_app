// Vzhled: 'light' (výchozí), 'dark' nebo 'auto' (podle systému). Výsledek = data-theme na <html>.
import { useEffect, useState } from 'react';

const KEY = 'forge:theme';
const listeners = new Set();
const mq = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

export const getTheme = () => {
  try { const v = localStorage.getItem(KEY); return v === 'dark' || v === 'auto' ? v : 'light'; } catch { return 'light'; }
};
const apply = () => {
  const m = getTheme();
  const dark = m === 'dark' || (m === 'auto' && mq?.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  syncThemeColor();
  listeners.forEach((f) => f());
};
// Barva stavového řádku = skutečná barva pozadí (i s podbarvením účtu, které je color-mix)
export const syncThemeColor = () => {
  const bg = getComputedStyle(document.body || document.documentElement).backgroundColor;
  const ok = bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', ok ? bg : getComputedStyle(document.documentElement).getPropertyValue('--paper').trim() || '#fafafa');
};
export const setTheme = (m) => {
  try { localStorage.setItem(KEY, m); } catch { /* ignore */ }
  apply();
};
if (typeof document !== 'undefined') {
  mq?.addEventListener('change', apply);
  apply();
}
export function useTheme() {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force((n) => n + 1);
    listeners.add(f);
    return () => listeners.delete(f);
  }, []);
  return { theme: getTheme(), setTheme };
}
