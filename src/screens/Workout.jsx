import { memo, useCallback, useEffect, useState } from 'react';
import { useSession } from '../lib/store.jsx';
import { better, countUnchecked, uid, DECIMAL_INPUT, fmtClock, fmtSet, INT_INPUT, isDone, num } from '../lib/util.js';
import { primeAudio } from '../lib/rest.js';
import { CheckIcon, PlusIcon, TrashIcon } from '../components/Icons.jsx';
import ExercisePicker from '../components/ExercisePicker.jsx';
import SwipeRow from '../components/SwipeRow.jsx';
import { InfoButton } from '../components/ExerciseInfo.jsx';
import { useDialog } from '../components/Dialog.jsx';
import { t } from '../lib/i18n.js';

// Chytrý krok váhy: malé jednoručky 0,5 kg, střed 1 kg, osa 2,5 kg.
const weightStep = (w, dir) => {
  const x = dir < 0 ? w - 0.001 : w;
  return x < 10 ? 0.5 : x < 40 ? 1 : 2.5;
};
const oneStep = () => 1;
const fmtV = (n) => String(Math.round(n * 100) / 100);

// Časovač tréninku jako samostatná komponenta – tik každou sekundu nepřekresluje série.
function Elapsed({ since }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return <>{fmtClock(now - since)}</>;
}

// Číselné pole s −/+; psaní je filtrované (jen čísla, max 3 cifry a 2 desetinná místa).
function NumField({ label, value, onChange, step, placeholder, mode, pattern }) {
  const bump = (dir) => {
    const cur = num(value);
    const next = Math.min(999, Math.max(0, cur + dir * step(cur, dir)));
    onChange(next ? fmtV(next) : '');
  };
  return (
    <div className="numfield">
      <button type="button" tabIndex={-1} aria-label={t('wo.dec', { what: label })} onClick={() => bump(-1)} disabled={!(num(value) > 0)}>−</button>
      <input aria-label={label} inputMode={mode} enterKeyHint="done" autoComplete="off" placeholder={placeholder} value={value}
        onFocus={(ev) => ev.target.select()}
        onChange={(ev) => { const v = ev.target.value; if (v === '' || pattern.test(v)) onChange(v); }} />
      <button type="button" tabIndex={-1} aria-label={t('wo.inc', { what: label })} onClick={() => bump(1)}>+</button>
    </div>
  );
}

const SetRow = memo(function SetRow({ exId, set, n, timed, pb, onPatch, onToggle, onRemove }) {
  const newPb = set.done && pb && better({ weight: num(set.weight), reps: timed ? 0 : num(set.reps), time: timed ? num(set.time) : 0 }, pb);
  return (
    <SwipeRow onDelete={() => onRemove(exId, set.id)} deleteLabel={t('wo.delSet', { n })} className={'set' + (set.done ? ' is-done' : '')}>
      <span className="set-n">{n}</span>
      <NumField label={t('wo.weight', { n })} placeholder="BW" mode="decimal" pattern={DECIMAL_INPUT} value={set.weight} step={weightStep} onChange={(v) => onPatch(exId, set.id, { weight: v })} />
      {timed
        ? <NumField label={t('wo.time', { n })} placeholder="0" mode="decimal" pattern={DECIMAL_INPUT} value={set.time || ''} step={oneStep} onChange={(v) => onPatch(exId, set.id, { time: v })} />
        : <NumField label={t('wo.reps', { n })} placeholder="0" mode="numeric" pattern={INT_INPUT} value={set.reps} step={oneStep} onChange={(v) => onPatch(exId, set.id, { reps: v })} />}
      <button className="check" aria-label={set.done ? t('wo.uncheck') : t('wo.check')} aria-pressed={set.done} onClick={() => onToggle(exId, set, timed)}>
        <CheckIcon width={20} height={20} />
      </button>
      {newPb && <span className="new-pb">{t('wo.newPb')}</span>}
    </SwipeRow>
  );
});

const ExerciseCard = memo(function ExerciseCard({ ex, index, count, pb, handlers }) {
  const timed = ex.type === 'time';
  return (
    <section className="card ex">
      <div className="ex-head">
        <div className="ex-title">
          <h2>{ex.name} <InfoButton name={ex.name} /></h2>
          <p className="muted small">{[ex.plan, ex.hint && t('wo.recommended', { w: ex.hint }), ex.note].filter(Boolean).join(' · ')}</p>
        </div>
        {pb && <span className="pb" title={t('wo.pb')}>PB {fmtSet(pb.weight, pb.reps, pb.time)}</span>}
      </div>
      <div className="set-cols label" aria-hidden="true"><span>{t('wo.col.set')}</span><span>{t('wo.col.kg')}</span><span>{timed ? t('wo.col.min') : t('wo.col.reps')}</span><span /></div>
      {ex.sets.map((s, si) => (
        <SetRow key={s.id} exId={ex.id} set={s} n={si + 1} timed={timed} pb={pb} onPatch={handlers.patchSet} onToggle={handlers.toggle} onRemove={handlers.removeSet} />
      ))}
      <div className="ex-actions">
        <button className="btn btn-ghost btn-sm" onClick={() => handlers.addSet(ex.id)}><PlusIcon width={16} height={16} /> {t('wo.addSet')}</button>
        <span className="spacer" />
        <button className="icon-btn" aria-label={t('wo.up')} disabled={index === 0} onClick={() => handlers.move(ex.id, -1)}>↑</button>
        <button className="icon-btn" aria-label={t('wo.down')} disabled={index === count - 1} onClick={() => handlers.move(ex.id, 1)}>↓</button>
        <button className="icon-btn danger" aria-label={t('wo.removeEx')} onClick={() => handlers.removeExercise(ex.id)}><TrashIcon width={18} height={18} /></button>
      </div>
    </section>
  );
});

export default function Workout({ go }) {
  const { active, patchActive, prs, finishWorkout, discardWorkout, notify, addExerciseToActive, startRest, stopRest } = useSession();
  const dialog = useDialog();
  const [picking, setPicking] = useState(() => Boolean(active && !active.exercises.length));
  const live = Boolean(active);

  // Displej nezhasne během tréninku
  useEffect(() => {
    if (!live || !('wakeLock' in navigator)) return;
    let lock, stopped = false;
    const acquire = () => navigator.wakeLock.request('screen').then((l) => { if (stopped) l.release(); else lock = l; }).catch(() => {});
    const onVis = () => document.visibilityState === 'visible' && acquire();
    acquire();
    document.addEventListener('visibilitychange', onVis);
    return () => { stopped = true; document.removeEventListener('visibilitychange', onVis); lock?.release().catch(() => {}); };
  }, [live]);

  // ——— Akce podle stabilních id (ne indexů) ———
  const mapEx = useCallback((exId, fn) => patchActive((a) => ({ ...a, exercises: a.exercises.map((e) => (e.id === exId ? fn(e) : e)) })), [patchActive]);
  const patchSet = useCallback((exId, setId, patch) => mapEx(exId, (e) => ({ ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) })), [mapEx]);

  const toggle = useCallback((exId, set, timed) => {
    if (!set.done && !(timed ? num(set.time) > 0 : num(set.reps) > 0)) return notify(t('wo.needReps'));
    navigator.vibrate?.(12);
    primeAudio();
    patchSet(exId, set.id, { done: !set.done });
    if (!set.done) startRest(); else stopRest();
  }, [notify, patchSet, startRest, stopRest]);

  const addSet = useCallback((exId) => mapEx(exId, (e) => {
    const prev = e.sets[e.sets.length - 1] || {};
    return { ...e, sets: [...e.sets, { id: uid(), weight: prev.weight || '', reps: prev.reps || '', time: prev.time || '', done: false }] };
  }), [mapEx]);

  // Smazání cviku s možností vrátit (místo potvrzovacího dialogu)
  const removeExercise = useCallback((exId) => {
    let removed = null, at = -1;
    patchActive((a) => {
      at = a.exercises.findIndex((e) => e.id === exId);
      removed = a.exercises[at];
      return { ...a, exercises: a.exercises.filter((e) => e.id !== exId) };
    });
    // removed/at se naplní při aplikaci updateru; akce „Zpět“ běží až potom
    notify(t('wo.exRemoved'), {
      action: { label: t('undo.btn'), run: () => removed && patchActive((a) => { const ex = [...a.exercises]; ex.splice(Math.min(at, ex.length), 0, removed); return { ...a, exercises: ex }; }) },
    });
  }, [patchActive, notify]);

  // Smazání série swipem; poslední série smaže celý cvik. Vždy s „Zpět“.
  const removeSet = useCallback((exId, setId) => {
    let removed = null, at = -1, wasLast = false, exAt = -1, exRemoved = null;
    patchActive((a) => {
      exAt = a.exercises.findIndex((e) => e.id === exId);
      const e = a.exercises[exAt];
      if (!e) return a;
      at = e.sets.findIndex((s) => s.id === setId);
      removed = e.sets[at];
      if (e.sets.length === 1) {
        wasLast = true;
        exRemoved = e;
        return { ...a, exercises: a.exercises.filter((x) => x.id !== exId) };
      }
      return { ...a, exercises: a.exercises.map((x) => (x.id === exId ? { ...x, sets: x.sets.filter((s) => s.id !== setId) } : x)) };
    });
    notify(t('wo.setRemoved'), {
      action: {
        label: t('undo.btn'),
        run: () => patchActive((a) => {
          if (wasLast && exRemoved) { const ex = [...a.exercises]; ex.splice(Math.min(exAt, ex.length), 0, exRemoved); return { ...a, exercises: ex }; }
          if (!removed) return a;
          return { ...a, exercises: a.exercises.map((x) => { if (x.id !== exId) return x; const sets = [...x.sets]; sets.splice(Math.min(at, sets.length), 0, removed); return { ...x, sets }; }) };
        }),
      },
    });
  }, [patchActive, notify]);

  const move = useCallback((exId, dir) => patchActive((a) => {
    const i = a.exercises.findIndex((e) => e.id === exId), j = i + dir;
    if (i < 0 || j < 0 || j >= a.exercises.length) return a;
    const ex = [...a.exercises];
    [ex[i], ex[j]] = [ex[j], ex[i]];
    return { ...a, exercises: ex };
  }), [patchActive]);

  const [handlers] = useState(() => ({}));
  Object.assign(handlers, { patchSet, toggle, addSet, removeSet, removeExercise, move }); // stabilní objekt, aktuální funkce

  if (!active) {
    return (
      <div className="screen">
        <header className="screen-head"><h1>{t('wo.title')}</h1></header>
        <div className="card empty-card">
          <p>{t('wo.none')}</p>
          <button className="btn btn-primary" onClick={() => go('templates')}>{t('wo.pickTemplate')}</button>
        </div>
      </div>
    );
  }

  const finish = async () => {
    const pending = countUnchecked(active);
    let includeUnchecked = false;
    if (pending) {
      const choice = await dialog.choose({
        title: t('wo.uncheckedTitle', { n: pending }),
        message: t('wo.uncheckedMsg'),
        actions: [
          { value: 'tick', label: t('wo.tickSave'), primary: true },
          { value: 'drop', label: t('wo.dropSave') },
          { value: null, label: t('dlg.cancel') },
        ],
      });
      if (!choice) return;
      includeUnchecked = choice === 'tick';
    }
    const r = finishWorkout({ includeUnchecked });
    if (r.empty) return notify(t('wo.needOne'));
    notify(r.beaten ? t('wo.savedPb', { n: r.beaten }) : t('wo.saved'));
    go('history');
  };
  const discard = async () => {
    if (await dialog.confirm(t('wo.confirmDiscard'), { danger: true, ok: t('wo.discard') })) discardWorkout();
  };

  const doneCount = active.exercises.reduce((n, e) => n + e.sets.filter(isDone).length, 0);
  const total = active.exercises.reduce((n, e) => n + e.sets.length, 0);

  return (
    <div className="screen">
      <header className="workout-head">
        <div>
          <h1>{active.name}</h1>
          <p className="label"><Elapsed since={active.startedAt} /> · {t('wo.sets', { done: doneCount, total })}</p>
        </div>
        <button className="btn btn-primary" onClick={finish}>{t('wo.finish')}</button>
      </header>
      <div className="progress" aria-hidden="true"><i style={{ width: `${total ? (doneCount / total) * 100 : 0}%` }} /></div>
      {active.exercises.length > 0 && <p className="muted small swipe-hint">{t('wo.swipeHint')}</p>}

      {active.exercises.map((e, ei) => (
        <ExerciseCard key={e.id} ex={e} index={ei} count={active.exercises.length} pb={prs[e.key]} handlers={handlers} />
      ))}

      {!active.exercises.length && <p className="empty">{t('wo.addFirst')}</p>}
      <button className={'btn btn-block ' + (active.exercises.length ? 'btn-ghost' : 'btn-primary')} onClick={() => setPicking(true)}><PlusIcon width={16} height={16} /> {t('wo.addEx')}</button>
      <button className="btn btn-danger btn-block discard-btn" onClick={discard}>{t('wo.discard')}</button>

      {picking && (
        <ExercisePicker
          exclude={active.exercises.map((e) => e.key)}
          onClose={() => setPicking(false)}
          onPick={(ex) => { addExerciseToActive(ex); setPicking(false); }}
        />
      )}
    </div>
  );
}
