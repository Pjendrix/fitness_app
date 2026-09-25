// Navigace přes historii prohlížeče (C5): systémové „Zpět“ (Android, gesto v iOS PWA) zavře panel
// nebo vrátí předchozí obrazovku, místo aby zavřelo appku. Adresa #/workout přežije reload.
import { useEffect, useRef } from 'react';

const TABS = new Set(['home', 'workout', 'history', 'templates', 'settings', 'stats', 'statsFull', 'exercises']);
const hasHistory = typeof window !== 'undefined' && typeof history !== 'undefined';
const fromHash = () => {
  const h = hasHistory ? location.hash.replace(/^#\/?/, '') : '';
  return TABS.has(h) ? h : null;
};
const urlOf = (tab) => `${location.pathname}${location.search}#/${tab}`;

export const initialTab = () => fromHash() || 'home';

// ——— Panely a podobrazovky: každý otevřený „zavíratelný“ prvek drží jeden záznam v historii ———
const closers = [];
let guard = false; // je na vrcholu historie náš záznam pro panel?
let ignorePops = 0; // popstate vyvolané naším vlastním history.back()
let releaseTimer = null;

const pushGuard = () => {
  history.pushState({ ...(history.state || {}), forgeOverlay: true }, '');
  guard = true;
};

if (hasHistory) {
  window.addEventListener('popstate', () => {
    if (ignorePops) { ignorePops--; return; }
    if (!guard) return;
    guard = false; // záznam panelu prohlížeč právě odebral
    closers[closers.length - 1]?.current?.();
    setTimeout(() => { if (closers.length && !guard) pushGuard(); }, 0); // pod ním je další panel
  });
}

// Zavřít prvek systémovým Zpět. onClose = null → nic neregistruje.
export function useBackClose(onClose) {
  const ref = useRef(onClose);
  ref.current = onClose;
  const enabled = Boolean(onClose) && hasHistory;
  useEffect(() => {
    if (!enabled) return undefined;
    closers.push(ref);
    clearTimeout(releaseTimer);
    if (!guard) pushGuard();
    return () => {
      const i = closers.indexOf(ref);
      if (i >= 0) closers.splice(i, 1);
      if (closers.length) return;
      // Odklad: když se hned otevře další panel (další dialog, jiný režim menu), záznam se použije znovu
      clearTimeout(releaseTimer);
      releaseTimer = setTimeout(() => {
        releaseTimer = null;
        if (!closers.length && guard) { guard = false; ignorePops++; history.back(); }
      }, 120);
    };
  }, [enabled]);
}

// ——— Záložky ———
export function pushTab(tab) {
  if (!hasHistory) return;
  if (guard && !closers.length) {
    // Panel se právě zavřel a jeho záznam ještě visí → přepsat ho místo back() + push (souběh v prohlížeči)
    clearTimeout(releaseTimer);
    releaseTimer = null;
    guard = false;
    history.replaceState({ tab }, '', urlOf(tab));
    return;
  }
  if (history.state?.tab === tab && !history.state?.forgeOverlay) return;
  guard = false; // případný záznam otevřeného panelu teď leží pod novou obrazovkou
  history.pushState({ tab }, '', urlOf(tab));
}
export function replaceTab(tab) {
  if (hasHistory) history.replaceState({ ...(history.state || {}), tab }, '', urlOf(tab));
}
export function onTabPop(cb) {
  if (!hasHistory) return () => {};
  const f = (e) => { const t = e.state?.tab || fromHash(); if (t) cb(t); };
  window.addEventListener('popstate', f);
  return () => window.removeEventListener('popstate', f);
}
