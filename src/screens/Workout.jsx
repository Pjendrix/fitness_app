import { useEffect, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { better, exKey, fmtClock, fmtSet, isDone, num } from '../lib/util.js';
import { CheckIcon, PlusIcon } from '../components/Icons.jsx';

export default function Workout({ go }) {
  const { active, setActive, prs, finishWorkout, discardWorkout, notify } = useStore();
  const [now, setNow] = useState(Date.now());
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    // Displej telefonu nezhasne během tréninku
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
  }, [active]);

  if (!active) {
    return (
      <div className="screen">
        <header className="screen-head"><h1>Trénink</h1></header>
        <div className="glass empty-card">
          <p>Žádný trénink neprobíhá.</p>
          <button className="btn btn-primary" onClick={() => go('templates')}>Vybrat šablonu</button>
        </div>
      </div>
    );
  }

  const patchSet = (ei, si, patch) =>
    setActive((a) => ({
      ...a,
      exercises: a.exercises.map((e, i) => (i !== ei ? e : { ...e, sets: e.sets.map((s, j) => (j !== si ? s : { ...s, ...patch })) })),
    }));

  const toggle = (ei, si) => {
    const s = active.exercises[ei].sets[si];
    if (!s.done && !(num(s.reps) > 0)) return notify('Doplň opakování');
    navigator.vibrate?.(12);
    patchSet(ei, si, { done: !s.done });
  };

  const addSet = (ei) =>
    setActive((a) => ({
      ...a,
      exercises: a.exercises.map((e, i) => {
        if (i !== ei) return e;
        const prev = e.sets[e.sets.length - 1] || { weight: '', reps: '' };
        return { ...e, sets: [...e.sets, { weight: prev.weight, reps: prev.reps, done: false }] };
      }),
    }));

  const addExercise = () => {
    const name = newName.trim();
    if (!name) return;
    setActive((a) => ({ ...a, exercises: [...a.exercises, { key: exKey(name), name, plan: '', note: '', sets: [{ weight: '', reps: '', done: false }] }] }));
    setNewName('');
    setAdding(false);
  };

  const finish = async () => {
    const r = await finishWorkout();
    if (r.empty) return notify('Zapiš a odškrtni aspoň jednu sérii');
    notify(r.beaten ? `Trénink uložen · ${r.beaten}× nový rekord` : 'Trénink uložen');
    go('history');
  };

  const discard = () => {
    if (window.confirm('Zahodit rozdělaný trénink?')) discardWorkout();
  };

  const doneCount = active.exercises.reduce((n, e) => n + e.sets.filter(isDone).length, 0);
  const total = active.exercises.reduce((n, e) => n + e.sets.length, 0);

  return (
    <div className="screen">
      <header className="workout-head">
        <div>
          <h1>{active.name}</h1>
          <p className="muted small"><span className="mono">{fmtClock(now - active.startedAt)}</span> · {doneCount}/{total} sérií</p>
        </div>
        <button className="btn btn-primary" onClick={finish}>Dokončit</button>
      </header>
      <div className="progress" aria-hidden="true"><i style={{ width: `${total ? (doneCount / total) * 100 : 0}%` }} /></div>

      {active.exercises.map((e, ei) => {
        const pb = prs[e.key];
        return (
          <section className="glass ex" key={ei}>
            <div className="ex-head">
              <div>
                <h2>{e.name}</h2>
                <p className="muted small">{[e.plan, e.hint && `doporučeno ${e.hint}`, e.note].filter(Boolean).join(' · ')}</p>
              </div>
              {pb && <span className="pb" title="Osobní rekord">PB: {fmtSet(pb.weight, pb.reps)}</span>}
            </div>
            <div className="set-cols small muted"><span>Série</span><span>kg</span><span>Opak.</span><span /></div>
            {e.sets.map((s, si) => {
              const cand = { weight: num(s.weight), reps: num(s.reps) };
              const newPb = s.done && pb && better(cand, pb);
              return (
                <div className={'set' + (s.done ? ' is-done' : '')} key={si}>
                  <span className="set-n mono">{si + 1}</span>
                  <input aria-label={`Váha, série ${si + 1}`} inputMode="decimal" placeholder="BW" value={s.weight} onFocus={(ev) => ev.target.select()} onChange={(ev) => patchSet(ei, si, { weight: ev.target.value })} />
                  <input aria-label={`Opakování, série ${si + 1}`} inputMode="numeric" placeholder="0" value={s.reps} onFocus={(ev) => ev.target.select()} onChange={(ev) => patchSet(ei, si, { reps: ev.target.value })} />
                  <button className="check" aria-label={s.done ? 'Zrušit odškrtnutí' : 'Odškrtnout sérii'} aria-pressed={s.done} onClick={() => toggle(ei, si)}>
                    <CheckIcon width={18} height={18} />
                  </button>
                  {newPb && <span className="new-pb">Nový rekord</span>}
                </div>
              );
            })}
            <button className="btn btn-ghost btn-sm" onClick={() => addSet(ei)}><PlusIcon width={16} height={16} /> Přidat sérii</button>
          </section>
        );
      })}

      {adding ? (
        <div className="glass add-ex">
          <input autoFocus placeholder="Název cvičení" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addExercise()} />
          <button className="btn btn-primary btn-sm" onClick={addExercise}>Přidat</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Zrušit</button>
        </div>
      ) : (
        <button className="btn btn-ghost btn-block" onClick={() => setAdding(true)}><PlusIcon width={16} height={16} /> Přidat cvičení</button>
      )}
      <button className="btn btn-danger-ghost btn-block" onClick={discard}>Zahodit trénink</button>
    </div>
  );
}
