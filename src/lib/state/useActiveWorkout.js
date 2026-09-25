import { useCallback, useEffect, useRef, useState } from 'react';
import { exKey, firstNum, hasValue, isDone, LIMITS, planLabel, sanitizeName, uid } from '../util.js';
import { applyWorkout } from '../records.js';
import { getRestDefault } from '../rest.js';
import { templateFromActive } from '../templateSync.js';
import { markGuide } from '../guide.js';
import { t } from '../i18n.js';
import { keepExercises, newSet, normalizeExercise, prevOf, withIds } from './model.js';

// ——— Draft rozdělaného tréninku (per uživatel, localStorage) ———
const draftKey = (u) => `forge:active:${u}`;
const LEGACY_DRAFT = 'forge:active';
const loadDraft = (u) => {
  try {
    let raw = localStorage.getItem(draftKey(u));
    if (!raw && localStorage.getItem(LEGACY_DRAFT)) {
      // Jednorázová migrace starého sdíleného klíče na prvního přihlášeného
      raw = localStorage.getItem(LEGACY_DRAFT);
      localStorage.removeItem(LEGACY_DRAFT);
    }
    return withIds(JSON.parse(raw));
  } catch {
    return null;
  }
};

// Aktivní trénink: draft, pauza, zápis sérií, dokončení. Psaní v tréninku mění jen tenhle stav (SessionCtx).
export function useActiveWorkout({ user, api, notify, prs, setPrs, workouts, setWorkouts, typeOf, templates, saveMainTemplate, saveTemplate }) {
  const [active, setActive] = useState(null);
  const [rest, setRest] = useState(null); // {until, total}

  // ——— Draft: načíst pro přihlášeného, ukládat s debounce, flush při schování appky ———
  const draftOwner = useRef(null);
  const pendingDraft = useRef(undefined);
  const draftTimer = useRef(null);
  const flushDraft = useCallback(() => {
    clearTimeout(draftTimer.current);
    const owner = draftOwner.current, v = pendingDraft.current;
    if (!owner || v === undefined) return;
    pendingDraft.current = undefined;
    try {
      if (v) localStorage.setItem(draftKey(owner), JSON.stringify(v));
      else localStorage.removeItem(draftKey(owner));
    } catch { /* plné úložiště – draft zůstane jen v paměti */ }
  }, []);
  useEffect(() => {
    flushDraft();
    draftOwner.current = user ? user.uid : null;
    setActive(user ? loadDraft(user.uid) : null);
    setRest(null);
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!draftOwner.current) return;
    pendingDraft.current = active;
    if (!active) flushDraft();
    else { clearTimeout(draftTimer.current); draftTimer.current = setTimeout(flushDraft, 300); }
  }, [active, flushDraft]);
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && flushDraft();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flushDraft);
    return () => { document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', flushDraft); };
  }, [flushDraft]);

  // Poslední zapsané série cviku (historie je seřazená od nejnovější)
  const lastSets = useCallback((key) => {
    for (const w of workouts) {
      const e = w.exercises.find((x) => x.key === key);
      if (e && e.sets.length) return e.sets;
    }
    return null;
  }, [workouts]);

  // ——— Aktivní trénink ———
  const startWorkout = useCallback((tpl) => {
    const exercises = tpl.exercises.map((e) => {
      const key = exKey(e.name);
      const last = lastSets(key);
      // Předvyplnění: 1) poslední trénink 2) plán série 3) výchozí váha/opakování šablony
      const sets = Array.from({ length: e.sets }, (_, i) => {
        const src = last ? last[Math.min(i, last.length - 1)] : null;
        if (src) return newSet(src);
        const p = e.plan?.[i];
        return newSet({ weight: p?.w || e.weight || '', reps: p ? (typeof p.r === 'number' ? p.r : '') : firstNum(e.reps), time: p?.t || e.time || '' });
      });
      const type = e.type || typeOf(e.name);
      // prev = minulé série (řádek „minule“), spec/specs = rozsah opakování pro cíl progrese, ss = superset skupina
      return {
        id: uid(), key, name: e.name, type, plan: type === 'time' ? t('count.sets', { n: e.sets }) : planLabel(e), hint: last ? '' : e.hint || '', note: e.note || '', sets,
        prev: last ? last.map(prevOf) : null, spec: e.reps ?? '', specTo: e.repsTo || null, specs: e.plan ? e.plan.map((p) => p.r) : null, ss: e.ss || '',
      };
    });
    setRest(null);
    markGuide('start');
    setActive({ id: uid(), templateId: tpl.id, name: tpl.name, group: tpl.group || '', variant: tpl.variant || '', startedAt: Date.now(), exercises });
  }, [lastSets, typeOf]);

  const startEmptyWorkout = useCallback(() => {
    setRest(null);
    markGuide('start');
    setActive({ id: uid(), templateId: '', name: t('wo.emptyName'), group: '', variant: '', startedAt: Date.now(), exercises: [] });
  }, []);
  const discardWorkout = useCallback(() => { setActive(null); setRest(null); }, []);

  const finishWorkout = useCallback(({ includeUnchecked = false } = {}) => {
    if (!active) return { empty: true };
    const draft = active, prevPrs = prs;
    const finishedAt = Date.now();
    const exercises = keepExercises(active.exercises.map((e) => {
      const timed = e.type === 'time';
      const sets = e.sets
        .filter((s) => !s.warm) // rozcvičkové série se neukládají (nepočítají se do objemu ani rekordů)
        .filter((s) => isDone(s) || (includeUnchecked && hasValue(s, timed)));
      return normalizeExercise({ key: e.key, name: e.name, type: e.type, note: e.memo, rpe: e.rpe, ss: e.ss }, sets);
    }));
    if (!exercises.length) return { empty: true };

    const done = {
      id: active.id, templateId: String(active.templateId || '').slice(0, 60), name: sanitizeName(active.name) || t('wo.emptyName'),
      group: sanitizeName(active.group, 20), variant: sanitizeName(active.variant, LIMITS.variant),
      startedAt: active.startedAt, finishedAt: Math.max(finishedAt, active.startedAt), exercises,
    };
    const { next, updates, beaten } = applyWorkout(done, prs);
    setWorkouts((w) => [done, ...w.filter((x) => x.id !== done.id)]);
    setPrs(next);
    setActive(null);
    setRest(null);
    // Offline se zápis zařadí do fronty a odešle později. Selže jen při odmítnutí serverem → vrátit draft.
    api.saveWorkout(done, updates).catch((e) => {
      console.error(e);
      setActive((cur) => cur || draft);
      setPrs(prevPrs);
      setWorkouts((w) => w.filter((x) => x.id !== done.id));
      notify(t('err.saveWorkout', { m: e?.code || e?.message || '?' }), { duration: 8000 });
    });
    return { empty: false, beaten, done };
  }, [active, prs, api, notify, setPrs, setWorkouts]);

  const patchActive = useCallback((fn) => setActive((a) => (a ? fn(a) : a)), []);
  const addExerciseToActive = useCallback((ex) => {
    const key = exKey(ex.name);
    const last = lastSets(key);
    const type = ex.type || typeOf(ex.name);
    const sets = (last || [{}]).map(newSet);
    while (sets.length < (type === 'time' ? 1 : 3)) sets.push(newSet(sets[sets.length - 1]));
    patchActive((a) => ({ ...a, exercises: [...a.exercises, { id: uid(), key, name: ex.name, type, plan: '', hint: '', note: '', sets, prev: last ? last.map(prevOf) : null, ss: '' }] }));
  }, [lastSets, patchActive, typeOf]);

  // Nahrazení cviku v aktivním tréninku (obsazené stanoviště).
  // Bez odškrtnutých sérií → výměna na místě. S odškrtnutými → hotové série zůstanou u původního cviku,
  // náhrada se vloží hned pod něj se zbývajícím počtem sérií.
  const replaceExerciseInActive = useCallback((exId, ex) => {
    const old = active?.exercises.find((e) => e.id === exId);
    if (!old) return;
    const key = exKey(ex.name);
    if (key === old.key) return;
    const type = ex.type || typeOf(ex.name);
    const last = lastSets(key);
    const done = old.sets.filter(isDone);
    const count = Math.max(1, old.sets.length - done.length);
    const sets = Array.from({ length: count }, (_, i) => newSet(last ? last[Math.min(i, last.length - 1)] : {}));
    const plan = type === (old.type || 'reps') ? old.plan : type === 'time' ? t('count.sets', { n: count }) : '';
    const fresh = { id: uid(), key, name: ex.name, type, plan, hint: '', note: '', sets, prev: last ? last.map(prevOf) : null, spec: type === (old.type || 'reps') ? old.spec : undefined, specTo: type === (old.type || 'reps') ? old.specTo : null, ss: old.ss || '' };
    const split = done.length > 0;
    patchActive((a) => {
      const i = a.exercises.findIndex((e) => e.id === exId);
      if (i < 0) return a;
      const list = [...a.exercises];
      if (split) list.splice(i, 1, { ...a.exercises[i], sets: a.exercises[i].sets.filter(isDone) }, fresh);
      else list.splice(i, 1, fresh);
      return { ...a, exercises: list };
    });
    notify(t(split ? 'rep.doneSplit' : 'rep.done', { from: old.name, to: ex.name }), {
      duration: 6000,
      action: {
        label: t('undo.btn'),
        run: () => patchActive((a) => {
          const list = a.exercises.filter((e) => e.id !== fresh.id);
          const at = list.findIndex((e) => e.id === old.id);
          if (at >= 0) list[at] = old; else list.push(old);
          return { ...a, exercises: list };
        }),
      },
    });
  }, [active, lastSets, typeOf, patchActive, notify]);

  // ——— Pauza ———
  const startRest = useCallback(() => {
    const total = getRestDefault();
    if (total > 0) setRest({ until: Date.now() + total * 1000, total });
  }, []);
  const adjustRest = useCallback((delta) => setRest((r) => (r ? { ...r, until: Math.max(Date.now() + 5000, r.until + delta * 1000), total: Math.max(5, r.total + delta) } : r)), []);
  const stopRest = useCallback(() => setRest(null), []);

  // W4: uložit změny z tréninku do jeho šablony (hlavní i vlastní)
  const syncTemplate = useCallback((tplId, snapshot) => {
    const tpl = templates.find((x) => x.id === tplId);
    if (!tpl || !snapshot) return false;
    const next = templateFromActive(tpl, snapshot);
    if (tpl.builtin) { const { builtin: _b, name: _n, ...rest } = next; saveMainTemplate(rest); }
    else saveTemplate(next);
    return true;
  }, [templates, saveMainTemplate, saveTemplate]);

  // Odhlášení: draft zůstane uložený pro svého majitele
  const detachDraft = useCallback(() => { flushDraft(); draftOwner.current = null; }, [flushDraft]);
  const resetSession = useCallback(() => { setActive(null); setRest(null); }, []);

  return {
    active, rest, patchActive, finishWorkout, discardWorkout, addExerciseToActive, replaceExerciseInActive,
    startWorkout, startEmptyWorkout, startRest, adjustRest, stopRest, syncTemplate, detachDraft, resetSession,
  };
}
