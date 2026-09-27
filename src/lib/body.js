// E1 + E3 – čisté funkce: tělesná váha, cviky s vlastní vahou, časy sérií a pauzy. Testy: body.test.js
import { exKey, num } from './util.js';

// ——— Tělesná váha: jeden záznam na den, id = YYYY-MM-DD (místní čas) ———
export const BODY_MIN = 20, BODY_MAX = 400;
const pad = (n) => String(n).padStart(2, '0');
export const dayId = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
// Záznam dne s časem v poledne – ať se datum nepřehoupne při změně časového pásma
export const bodyEntry = (ms, weight) => {
  const d = new Date(ms); d.setHours(12, 0, 0, 0);
  return { id: dayId(ms), date: d.getTime(), weight: Math.round(num(weight) * 10) / 10 };
};
export const validBody = (w) => num(w) >= BODY_MIN && num(w) <= BODY_MAX;
// Váha platná k danému okamžiku: poslední záznam do té doby, jinak nejbližší pozdější (list libovolně seřazený)
export function bodyAt(list, ms) {
  let before = null, after = null;
  for (const b of list) {
    if (b.date <= ms + 43200000) { if (!before || b.date > before.date) before = b; }
    else if (!after || b.date < after.date) after = b;
  }
  return (before || after)?.weight ?? null;
}
// Změna váhy za posledních `days` dní → { now, delta } (delta null, když starší záznam chybí)
export function bodyTrend(list, days = 30, now = Date.now()) {
  if (!list.length) return null;
  const sorted = [...list].sort((a, b) => b.date - a.date);
  const cur = sorted[0];
  const ref = sorted.find((b) => b.date <= now - days * 864e5) || (sorted.length > 1 ? sorted[sorted.length - 1] : null);
  return { now: cur.weight, date: cur.date, delta: ref && ref !== cur ? Math.round((cur.weight - ref.weight) * 10) / 10 : null };
}

// ——— Cviky s vlastní vahou: do objemu se počítá tělesná váha × podíl + přidaná zátěž ———
// Podíl tělesné váhy, kterou cvik reálně zvedá (kliky ~65 %, dipy na lavici ~70 %). Knihovna může přebít (bw: 0 = vypnuto).
export const BW_DEFAULTS = {
  dips: 1, 'pull-up': 1, 'weighted-pull-up': 1, 'chin-up': 1, 'pistol-squat': 1, 'push-up': 0.65, 'bench-dips': 0.7,
};
export const defaultBw = (name) => BW_DEFAULTS[exKey(name)] || 0;
// Uložená tělesná váha u cviku v tréninku (e.bw, kg) + zátěž série
export const setLoad = (e, s) => num(s.weight) + num(e?.bw);

// ——— E1: časy sérií ———
// Časy odškrtnutí (ms) všech sérií tréninku, vzestupně
export const setTimes = (w) => w.exercises.flatMap((e) => e.sets.map((s) => s.at)).filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b);
// Typická pauza v sekundách = medián rozestupů mezi sériemi (rozestupy nad 15 min = přestávka, nepočítají se)
export function restOf(w) {
  const t = setTimes(w);
  const gaps = [];
  for (let i = 1; i < t.length; i++) { const g = (t[i] - t[i - 1]) / 1000; if (g >= 5 && g <= 900) gaps.push(g); }
  if (gaps.length < 2) return null;
  gaps.sort((a, b) => a - b);
  const m = gaps.length >> 1;
  return Math.round(gaps.length % 2 ? gaps[m] : (gaps[m - 1] + gaps[m]) / 2);
}
// Poslední odškrtnutá série rozdělaného tréninku (ms) nebo null
export const lastSetAt = (active) => {
  const t = setTimes(active || { exercises: [] });
  return t.length ? t[t.length - 1] : null;
};
// Zapomenuté „Dokončit“: od poslední série uběhlo víc než limit
export const STALE_FINISH_MS = 45 * 60000;
export const fmtRest = (sec) => (sec >= 60 ? `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}` : `${Math.round(sec)} s`);
