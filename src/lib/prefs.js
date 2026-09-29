// Volby zařízení (localStorage) s hookem pro překreslení – např. swipe doprava pro RPE a poznámku (5.5).
import { useEffect, useState } from 'react';

const listeners = new Set();
const read = (key, def) => { try { const v = localStorage.getItem(key); return v == null ? def : v === '1'; } catch { return def; } };
export const PREFS = { swipeSet: { key: 'forge:swipeSet', def: true } };
export const getPref = (name) => read(PREFS[name].key, PREFS[name].def);
export const setPref = (name, on) => {
  try { localStorage.setItem(PREFS[name].key, on ? '1' : '0'); } catch { /* ignore */ }
  listeners.forEach((f) => f());
};
export function usePref(name) {
  const [v, setV] = useState(() => getPref(name));
  useEffect(() => {
    const f = () => setV(getPref(name));
    listeners.add(f);
    return () => listeners.delete(f);
  }, [name]);
  return v;
}
