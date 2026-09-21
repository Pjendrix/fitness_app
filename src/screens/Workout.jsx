import { useEffect, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { better, fmtClock, fmtSet, isDone, num } from '../lib/util.js';
import { CheckIcon, PlusIcon, TrashIcon, XIcon } from '../components/Icons.jsx';
import ExercisePicker from '../components/ExercisePicker.jsx';
import { t } from '../lib/i18n.js';

// Smart weight step: small dumbbells 0.5 kg, mid 1 kg, barbell range 2.5 kg.
const weightStep = (w, dir) => {
  const x = dir < 0 ? w - 0.001 : w;
  return x < 10 ? 0.5 : x < 40 ? 1 : 2.5;
};
const fmtV = (n) => String(Math.round(n * 100) / 100);

// Number input with minimal − / + buttons; still typeable.
function NumField({ label, value, onChange, step, placeholder, mode }) {
  const bump = (dir) => {
    const cur = num(value);
    const next = Math.max(0, cur + dir * step(cur, dir));
    onChange(next ? fmtV(next) : '');
  };
  return (
    <div className="numfield">
      <button type="button" tabIndex={-1} aria-label="−" onClick={() => bump(-1)} disabled={!(num(value) > 0)}>−</button>
      <input aria-label={label} inputMode={mode} placeholder={placeholder} value={value} onFocus={(ev) => ev.target.select()} onChange={(ev) => onChange(ev.target.value)} />
      <button type="button" tabIndex={-1} aria-label="+" onClick={() => bump(1)}>+</button>
    </div>
  );
}

export default function Workout({ go }) {
  const { active, patchActive, prs, finishWorkout, discardWorkout, notify, addExerciseToActive } = useStore();
  const [now, setNow] = useState(Date.now());
  const [picking, setPicking] = useState(() => Boolean(active && !active.exercises.length));

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    // Keep the phone screen awake during the workout
    let lock;
    const acquire = () => navigator.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => {});
    const onVis = () => document.visibilityState === 'visible' && acquire();
    acquire();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
      lock?.release().catch(() => {});
    };
  }, [Boolean(active)]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const mapEx = (ei, fn) => patchActive((a) => ({ ...a, exercises: a.exercises.map((e, i) => (i === ei ? fn(e) : e)) }));
  const patchSet = (ei, si, patch) => mapEx(ei, (e) => ({ ...e, sets: e.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)) }));

  const toggle = (ei, si) => {
    const s = active.exercises[ei].sets[si];
    const ex = active.exercises[ei];
    if (!s.done && !(ex.type === 'time' ? num(s.time) > 0 : num(s.reps) > 0)) return notify(t('wo.needReps'));
    navigator.vibrate?.(12);
    patchSet(ei, si, { done: !s.done });
  };

  const addSet = (ei) =>
    mapEx(ei, (e) => {
      const prev = e.sets[e.sets.length - 1] || { weight: '', reps: '' };
      return { ...e, sets: [...e.sets, { weight: prev.weight, reps: prev.reps, time: prev.time || '', done: false }] };
    });

  const removeSet = (ei, si) => {
    const e = active.exercises[ei];
    if (e.sets.length === 1) return removeExercise(ei);
    mapEx(ei, (x) => ({ ...x, sets: x.sets.filter((_, j) => j !== si) }));
  };

  const removeExercise = (ei) => {
    const e = active.exercises[ei];
    if (!window.confirm(t('wo.confirmRemoveEx', { name: e.name }))) return;
    patchActive((a) => ({ ...a, exercises: a.exercises.filter((_, i) => i !== ei) }));
  };

  const move = (ei, dir) =>
    patchActive((a) => {
      const j = ei + dir;
      if (j < 0 || j >= a.exercises.length) return a;
      const ex = [...a.exercises];
      [ex[ei], ex[j]] = [ex[j], ex[ei]];
      return { ...a, exercises: ex };
    });

  const finish = async () => {
    const r = await finishWorkout();
    if (r.empty) return notify(t('wo.needOne'));
    notify(r.beaten ? t('wo.savedPb', { n: r.beaten }) : t('wo.saved'));
    go('history');
  };

  const doneCount = active.exercises.reduce((n, e) => n + e.sets.filter(isDone).length, 0);
  const total = active.exercises.reduce((n, e) => n + e.sets.length, 0);

  return (
    <div className="screen">
      <header className="workout-head">
        <div>
          <h1>{active.name}</h1>
          <p className="label">{fmtClock(now - active.startedAt)} · {t('wo.sets', { done: doneCount, total })}</p>
        </div>
        <button className="btn btn-primary" onClick={finish}>{t('wo.finish')}</button>
      </header>
      <div className="progress" aria-hidden="true"><i style={{ width: `${total ? (doneCount / total) * 100 : 0}%` }} /></div>

      {active.exercises.map((e, ei) => {
        const pb = prs[e.key];
        return (
          <section className="card ex" key={e.key + ei}>
            <div className="ex-head">
              <div className="ex-title">
                <h2>{e.name}</h2>
                <p className="muted small">{[e.plan, e.hint && t('wo.recommended', { w: e.hint }), e.note].filter(Boolean).join(' · ')}</p>
              </div>
              {pb && <span className="pb" title={t('wo.pb')}>PB {fmtSet(pb.weight, pb.reps, pb.time)}</span>}
            </div>
            <div className="set-cols label"><span>{t('wo.col.set')}</span><span>{t('wo.col.kg')}</span><span>{e.type === 'time' ? t('wo.col.min') : t('wo.col.reps')}</span><span /><span /></div>
            {e.sets.map((s, si) => {
              const timed = e.type === 'time';
              const newPb = s.done && better({ weight: num(s.weight), reps: timed ? 0 : num(s.reps), time: timed ? num(s.time) : 0 }, pb) && pb;
              return (
                <div className={'set' + (s.done ? ' is-done' : '')} key={si}>
                  <span className="set-n">{si + 1}</span>
                  <NumField label={t('wo.weight', { n: si + 1 })} placeholder="BW" mode="decimal" value={s.weight} step={weightStep} onChange={(v) => patchSet(ei, si, { weight: v })} />
                  {timed
                    ? <NumField label={t('wo.col.min')} placeholder="0" mode="decimal" value={s.time || ''} step={() => 1} onChange={(v) => patchSet(ei, si, { time: v })} />
                    : <NumField label={t('wo.reps', { n: si + 1 })} placeholder="0" mode="numeric" value={s.reps} step={() => 1} onChange={(v) => patchSet(ei, si, { reps: v })} />}
                  <button className="check" aria-label={s.done ? t('wo.uncheck') : t('wo.check')} aria-pressed={s.done} onClick={() => toggle(ei, si)}>
                    <CheckIcon width={18} height={18} />
                  </button>
                  <button className="icon-btn" aria-label={t('wo.delSet', { n: si + 1 })} onClick={() => removeSet(ei, si)}><XIcon width={16} height={16} /></button>
                  {newPb && <span className="new-pb">{t('wo.newPb')}</span>}
                </div>
              );
            })}
            <div className="ex-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => addSet(ei)}><PlusIcon width={16} height={16} /> {t('wo.addSet')}</button>
              <span className="spacer" />
              <button className="icon-btn" aria-label={t('wo.up')} disabled={ei === 0} onClick={() => move(ei, -1)}>↑</button>
              <button className="icon-btn" aria-label={t('wo.down')} disabled={ei === active.exercises.length - 1} onClick={() => move(ei, 1)}>↓</button>
              <button className="icon-btn danger" aria-label={t('wo.removeEx')} onClick={() => removeExercise(ei)}><TrashIcon width={17} height={17} /></button>
            </div>
          </section>
        );
      })}

      {!active.exercises.length && <p className="empty">{t('wo.addFirst')}</p>}
      <button className={'btn btn-block ' + (active.exercises.length ? 'btn-ghost' : 'btn-primary')} onClick={() => setPicking(true)}><PlusIcon width={16} height={16} /> {t('wo.addEx')}</button>
      <button className="btn btn-danger btn-block" onClick={() => window.confirm(t('wo.confirmDiscard')) && discardWorkout()}>{t('wo.discard')}</button>

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
