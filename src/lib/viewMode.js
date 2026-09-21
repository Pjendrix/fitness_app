// Režim zobrazení: 'auto' (podle šířky okna), 'mobile' nebo 'desktop'. Výsledek = třída .desktop na <html>.
import { useEffect, useState } from 'react';

const KEY = 'forge:view';
const mq = typeof window !== 'undefined' ? window.matchMedia('(min-width: 960px)') : null;
const listeners = new Set();

export const getMode = () => {
  try { return localStorage.getItem(KEY) || 'auto'; } catch { return 'auto'; }
};
const apply = () => {
  const m = getMode();
  const desktop = m === 'desktop' || (m === 'auto' && mq?.matches);
  document.documentElement.classList.toggle('desktop', Boolean(desktop));
  listeners.forEach((f) => f());
};
export const setMode = (m) => {
  try { localStorage.setItem(KEY, m); } catch { /* ignore */ }
  apply();
};
export const isDesktop = () => document.documentElement.classList.contains('desktop');

if (mq) {
  mq.addEventListener('change', apply);
  apply();
}

export function useViewMode() {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force((n) => n + 1);
    listeners.add(f);
    return () => listeners.delete(f);
  }, []);
  return { mode: getMode(), desktop: isDesktop(), setMode };
}
