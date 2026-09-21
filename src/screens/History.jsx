import { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { fmtDate, fmtDuration, fmtNum, fmtSet, workoutVolume } from '../lib/util.js';
import { ChevronIcon, TrashIcon } from '../components/Icons.jsx';

export default function History() {
  const { workouts, deleteWorkout, loading } = useStore();
  const [open, setOpen] = useState(null);

  return (
    <div className="screen">
      <header className="screen-head"><h1>Historie</h1></header>
      {!workouts.length && <p className="empty">{loading ? 'Načítám…' : 'Zatím žádný odcvičený trénink.'}</p>}
      {workouts.map((w) => {
        const isOpen = open === w.id;
        const sets = w.exercises.reduce((n, e) => n + e.sets.length, 0);
        return (
          <section className="glass hist" key={w.id}>
            <button className="hist-head" onClick={() => setOpen(isOpen ? null : w.id)} aria-expanded={isOpen}>
              <div>
                <h2>{w.name}</h2>
                <p className="muted small">{fmtDate(w.startedAt)} · {fmtDuration(w.finishedAt - w.startedAt)} · {sets} sérií · {fmtNum(Math.round(workoutVolume(w)))} kg</p>
              </div>
              <ChevronIcon className={'chev' + (isOpen ? ' is-open' : '')} />
            </button>
            {isOpen && (
              <div className="hist-body">
                {w.exercises.map((e) => (
                  <div key={e.key} className="hist-ex">
                    <div>{e.name}</div>
                    <div className="mono muted small">{e.sets.map((s) => fmtSet(s.weight, s.reps)).join('  ·  ')}</div>
                  </div>
                ))}
                <button className="btn btn-danger-ghost btn-sm" onClick={() => window.confirm('Smazat trénink z historie?') && deleteWorkout(w.id)}>
                  <TrashIcon width={16} height={16} /> Smazat
                </button>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
