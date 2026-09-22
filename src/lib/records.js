// Osobní rekordy – čisté funkce (testované v records.test.js).
import { better } from './util.js';

const prOf = (s, name, date) => ({ weight: s.weight, reps: s.reps, ...(s.time ? { time: s.time } : {}), name, date });

// Nejlepší série cviku napříč tréninky (nebo null).
// Prochází od nejstaršího, takže při shodě zůstane datum prvního dosažení (stejně jako při zápisu).
const chrono = (workouts) => [...workouts].sort((a, b) => a.finishedAt - b.finishedAt);
export const bestSet = (workouts, key) => {
  let best = null;
  for (const w of chrono(workouts)) for (const e of w.exercises) if (e.key === key)
    for (const s of e.sets) if (better(s, best)) best = prOf(s, e.name, w.finishedAt);
  return best;
};

// Započítá trénink do rekordů → { next, updates (jen změněné klíče), beaten (počet překonaných cviků) }
export const applyWorkout = (w, prs) => {
  const next = { ...prs };
  const updates = {};
  const beaten = new Set();
  for (const e of w.exercises) for (const s of e.sets) {
    if (!better(s, next[e.key])) continue;
    if (next[e.key]) beaten.add(e.key);
    next[e.key] = prOf(s, e.name, w.finishedAt);
    updates[e.key] = next[e.key];
  }
  return { next, updates, beaten: beaten.size };
};

// Po smazání tréninku: rekordy, které z něj pocházely, se přepočítají ze zbytku historie.
// Výsledek { [key]: pr | null } – null = rekord smazat (cvik už v historii není).
export const changesAfterDelete = (removed, remaining, prs) => {
  const out = {};
  for (const e of removed.exercises) {
    const cur = prs[e.key];
    if (!cur || cur.date !== removed.finishedAt || e.key in out) continue;
    out[e.key] = bestSet(remaining, e.key);
  }
  return out;
};

export const applyChanges = (prs, changes) => {
  const n = { ...prs };
  for (const [k, v] of Object.entries(changes)) { if (v) n[k] = v; else delete n[k]; }
  return n;
};

// Přepočet vybraných cviků z celé (načtené) historie → jen skutečné změny { [key]: pr | null }.
// Pozn.: počítá z načtených tréninků (limit 1000); starší rekord mimo okno by se tu nezohlednil.
const samePr = (a, b) => a.weight === b.weight && a.reps === b.reps && (a.time || 0) === (b.time || 0) && a.date === b.date && a.name === b.name;
export const recomputeKeys = (keys, workouts, prs) => {
  const out = {};
  for (const k of keys) {
    const b = bestSet(workouts, k), cur = prs[k];
    if (!b) { if (cur) out[k] = null; continue; }
    if (!cur || !samePr(cur, b)) out[k] = b;
  }
  return out;
};
