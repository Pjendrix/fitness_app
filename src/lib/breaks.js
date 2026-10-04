// Pauzy a lehké týdny (nastavení účtu: settings.breaks). Čisté funkce, testy v breaks.test.js.
//   pause  – nemoc / dovolená / zranění: Heat i série stojí, čas se „zastaví“
//   deload – lehký týden: méně sérií, stejné váhy; týden se počítá jako splněný
// Záznam: { kind: 'pause' | 'deload', from: ms, to: ms | null, mode? } (to null = pořád běží)
// mode u lehkého týdne: 'light' = stejné série, váhy −12,5 % · 'short' = ~60 % sérií, stejné váhy + krátké kardio
const DAY = 864e5;
export const BREAK_KINDS = ['pause', 'deload'];
export const MAX_BREAKS = 24;
export const DELOAD_DAYS = 7;
export const DELOAD_MODES = ['light', 'short'];
export const deloadMode = (b) => (b ? (b.mode === 'short' ? 'short' : 'light') : null);

const endOf = (b, now) => (b.to == null ? now : b.to);
// Platné záznamy seřazené podle začátku
export const cleanBreaks = (list) => (Array.isArray(list) ? list : [])
  .filter((b) => b && BREAK_KINDS.includes(b.kind) && Number.isFinite(b.from) && (b.to == null || (Number.isFinite(b.to) && b.to >= b.from)))
  .map((b) => ({ kind: b.kind, from: Math.round(b.from), to: b.to == null ? null : Math.round(b.to), ...(b.kind === 'deload' && DELOAD_MODES.includes(b.mode) ? { mode: b.mode } : {}) }))
  .sort((a, b) => a.from - b.from)
  .slice(-MAX_BREAKS);

// Běžící přestávka daného druhu (deload s koncem v budoucnosti taky běží)
export const activeBreak = (breaks, kind, now = Date.now()) =>
  breaks.find((b) => b.kind === kind && b.from <= now && (b.to == null || b.to > now)) || null;
export const inBreak = (breaks, t, kind) => breaks.some((b) => b.kind === kind && b.from <= t && t < endOf(b, Infinity));

// Kolik ms pauzy (kind 'pause') uběhlo do okamžiku t
export function pausedBefore(breaks, t, now = Date.now()) {
  let ms = 0;
  for (const b of breaks) {
    if (b.kind !== 'pause') continue;
    const end = Math.min(endOf(b, now), t);
    if (end > b.from) ms += end - b.from;
  }
  return ms;
}
// „Tréninkový čas“: skutečný čas bez pauz → Heat během pauzy nechladne
export const effTime = (breaks, now = Date.now()) => (t) => t - pausedBefore(breaks, t, now);

// Omluvený týden (pondělí → 'pause' | 'deload' | null): přestávka pokrývá aspoň 3 dny týdne
export function weekExcuse(breaks, mon, now = Date.now()) {
  const end = mon + 7 * DAY;
  let best = null, bestMs = 0;
  for (const b of breaks) {
    const ms = Math.min(endOf(b, now), end) - Math.max(b.from, mon);
    if (ms >= 3 * DAY - 36e5 && ms > bestMs) { best = b.kind; bestMs = ms; } // −1 h: změna času
  }
  return best;
}
