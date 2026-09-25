// Čisté funkce datového modelu (bez Reactu a Firebase) – migrace, normalizace a pomocníci pro store.
// Testy: model.test.js
import { EXERCISES, modernName, normCat } from '../../data/exercises.js';
import { better, exKey, LIMITS, sanitizeName, sanitizeSet, uid } from '../util.js';

export const MAX_PINS = 5;
export const LEGACY_PINK = { tint: '#e27aa3', strength: 70, accent: null };

export const byStart = (list) => [...list].sort((a, b) => b.startedAt - a.startedAt);
export const prevOf = (s) => ({ weight: Number(s.weight) || 0, reps: Number(s.reps) || 0, time: Number(s.time) || 0 });
export const newSet = (s = {}) => ({ id: uid(), weight: String(s.weight || ''), reps: String(s.reps || ''), time: String(s.time || ''), done: false });

// Draft: každý cvik i série potřebují stabilní id (klíče Reactu, mazání swipem)
export const withIds = (a) =>
  a && Array.isArray(a.exercises)
    ? { ...a, exercises: a.exercises.map((e) => ({ ...e, id: e.id || uid(), sets: (e.sets || []).map((s) => ({ ...s, id: s.id || uid() })) })) }
    : null;

// ——— Migrace: staré české názvy cviků → anglické (historie, PB i šablony se dál párují) ———
export const migrateEx = (e) => {
  const name = modernName(e.name);
  return name === e.name ? e : { ...e, name, key: exKey(name) };
};
export const migrateWorkout = (w) => ({ ...w, exercises: (w.exercises || []).map(migrateEx) });
export const migratePrs = (prs) => {
  const out = {};
  for (const p of Object.values(prs)) {
    const name = modernName(p.name);
    const key = exKey(name);
    if (!out[key] || better(p, out[key])) out[key] = { ...p, name };
  }
  return out;
};
export const migrateTemplate = (tpl) => ({ ...tpl, exercises: tpl.exercises.map((e) => ({ ...e, name: modernName(e.name) })) });

// ——— Knihovna cviků ———
export const loadLibrary = (d) => {
  if (!d) return EXERCISES;
  const list = (d.list || []).map((e) => ({ name: modernName(e.name), cat: normCat(e.cat), ...(e.type === 'time' ? { type: 'time' } : {}), ...(e.db ? { db: e.db } : {}), ...(Number(e.step) > 0 ? { step: Number(e.step) } : {}) }));
  if (d.v === 2) return list;
  const have = new Set(EXERCISES.map((e) => exKey(e.name)));
  return [...EXERCISES, ...list.filter((e) => !have.has(exKey(e.name)))];
};
export const toLibEntry = (ex) => {
  const cat = normCat(ex.cat);
  return { name: sanitizeName(ex.name), cat, ...(ex.type === 'time' || (!ex.type && cat === 'cardio') ? { type: 'time' } : {}), ...(ex.db ? { db: String(ex.db).slice(0, 120) } : {}), ...(Number(ex.step) > 0 ? { step: Math.min(50, Math.round(Number(ex.step) * 4) / 4) } : {}) };
};

// ——— Normalizace před zápisem (B6: jedno místo pro dokončení, úpravu i import tréninku) ———
export const cleanSets = (sets, timed) =>
  (sets || []).map((s) => sanitizeSet(s, timed)).filter((s) => (timed ? s.time > 0 : s.reps > 0));

// Cvik k uložení. sets = už vybrané série (např. jen odškrtnuté); klíč se dopočítá z názvu, když chybí.
export const normalizeExercise = (e, sets = e.sets) => {
  const timed = e.type === 'time';
  const name = sanitizeName(e.name);
  const note = e.note ? sanitizeName(e.note, 200) : '';
  const rpe = Number(e.rpe);
  return {
    key: e.key || exKey(name), name, ...(timed ? { type: 'time' } : {}), sets: cleanSets(sets, timed),
    ...(note ? { note } : {}), ...(rpe >= 1 && rpe <= 10 ? { rpe } : {}), ...(e.ss ? { ss: String(e.ss).slice(0, 8) } : {}),
  };
};
// Jen cviky s aspoň jednou platnou sérií, max. limit na trénink
export const keepExercises = (list) => list.filter((e) => e.name && e.sets.length).slice(0, LIMITS.exercises);

// Trénink ze zálohy (JSON export) → validní dokument, nebo null
export const normalizeImported = (w, fallbackName) => {
  if (!w || typeof w.id !== 'string' || !Array.isArray(w.exercises) || !Number.isFinite(w.startedAt)) return null;
  const exercises = keepExercises(w.exercises.map((e) => normalizeExercise({ ...e, name: modernName(e.name || ''), key: undefined })));
  if (!exercises.length) return null;
  const startedAt = Math.round(w.startedAt);
  return {
    id: String(w.id).slice(0, 60), templateId: String(w.templateId || '').slice(0, 60), name: sanitizeName(w.name) || fallbackName,
    group: sanitizeName(w.group, 20), variant: sanitizeName(w.variant, LIMITS.variant), startedAt,
    finishedAt: Math.max(startedAt, Math.round(w.finishedAt || startedAt)), exercises,
  };
};

// ——— A3: přejmenování / sloučení cviku ———
// Přejmenuje cvik fromKey na toName ve všech trénincích. Když už trénink obsahuje cílový cvik,
// série se připojí k jeho prvnímu výskytu (jeden cvik = jeden záznam v tréninku).
// → { list, changed } (changed = jen upravené tréninky k zápisu)
export function renameInWorkouts(workouts, fromKey, toName) {
  const toKey = exKey(toName);
  const changed = [];
  const list = workouts.map((w) => {
    if (!w.exercises.some((e) => e.key === fromKey)) return w;
    const out = [];
    for (const e of w.exercises) {
      const cur = e.key === fromKey ? { ...e, key: toKey, name: toName } : e;
      const at = cur.key === toKey ? out.findIndex((x) => x.key === toKey) : -1;
      if (at < 0) { out.push(cur); continue; }
      const prev = out[at];
      const note = [prev.note, cur.note].filter(Boolean).join(' · ').slice(0, 200);
      out[at] = { ...prev, name: toName, sets: [...prev.sets, ...cur.sets], ...(note ? { note } : {}) };
    }
    const next = { ...w, exercises: out };
    changed.push(next);
    return next;
  });
  return { list, changed };
}

// Šablona: cviky se jménem fromKey → toName. null = šablona se nemění.
export function renameInTemplate(tpl, fromKey, toName) {
  if (!tpl.exercises.some((e) => exKey(e.name) === fromKey)) return null;
  return { ...tpl, exercises: tpl.exercises.map((e) => (exKey(e.name) === fromKey ? { ...e, name: toName } : e)) };
}
