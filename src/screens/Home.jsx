import { useMemo, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { GROUP_ORDER, GROUPS } from '../data/defaultTemplates.js';
import { fmtDate, fmtNum, fmtSet, startOfWeek, workoutVolume } from '../lib/util.js';

export default function Home({ go }) {
  const { user, workouts, prs, templates, active, startWorkout } = useStore();
  const [variant, setVariant] = useState('Normal');

  // Další v rotaci PUSH → PULL → LEGS podle posledního tréninku
  const next = useMemo(() => {
    const last = workouts.find((w) => GROUP_ORDER.includes(w.group));
    return last ? GROUP_ORDER[(GROUP_ORDER.indexOf(last.group) + 1) % 3] : 'PUSH';
  }, [workouts]);
  const [picked, setGroup] = useState(null);
  const group = picked ?? next;

  const week = useMemo(() => {
    const from = startOfWeek();
    const ws = workouts.filter((w) => w.startedAt >= from);
    return { count: ws.length, volume: ws.reduce((s, w) => s + workoutVolume(w), 0) };
  }, [workouts]);

  const recentPrs = useMemo(
    () => Object.values(prs).sort((a, b) => b.date - a.date).slice(0, 3),
    [prs]
  );

  const tpl = templates.find((t) => t.group === group && t.variant === variant);
  const first = (user?.name || '').split(' ')[0];

  const start = () => {
    startWorkout(tpl);
    go('workout');
  };

  return (
    <div className="screen">
      <header className="screen-head">
        <p className="muted">{first ? `Ahoj, ${first}` : 'Ahoj'}</p>
        <h1>Co dnes potrénujeme?</h1>
      </header>

      {active ? (
        <section className="card card-hero">
          <p className="label">Rozdělaný trénink</p>
          <h2 className="big">{active.name}</h2>
          <button className="btn btn-primary btn-block" onClick={() => go('workout')}>Pokračovat</button>
        </section>
      ) : (
        <section className="card card-hero">
          <p className="label">Rychlý start{group === next ? ' · na řadě' : ''}</p>
          <div className="seg" role="tablist" aria-label="Skupina">
            {GROUP_ORDER.map((g) => (
              <button key={g} role="tab" aria-selected={group === g} className={group === g ? 'is-on' : ''} onClick={() => setGroup(g)}>{g}</button>
            ))}
          </div>
          <p className="group-sub">{GROUPS[group].sub}</p>
          <div className="seg seg-sm" role="tablist" aria-label="Varianta">
            {['Normal', 'Hardcore'].map((v) => (
              <button key={v} role="tab" aria-selected={variant === v} className={variant === v ? 'is-on' : ''} onClick={() => setVariant(v)}>{v}</button>
            ))}
          </div>
          <p className="label">{tpl.exercises.length} cvičení · {tpl.exercises.reduce((s, e) => s + e.sets, 0)} sérií</p>
          <button className="btn btn-primary btn-block" onClick={start}>Začít {tpl.name}</button>
        </section>
      )}

      <section className="stats" onClick={() => go('stats')} role="button" tabIndex={0} aria-label="Otevřít statistiky">
        <div className="card stat"><span className="num">{week.count}</span><span className="muted small">tréninků tento týden</span></div>
        <div className="card stat"><span className="num">{week.volume ? fmtNum(Math.round(week.volume / 100) / 10) : 0}<small> t</small></span><span className="muted small">objem tento týden</span></div>
        <div className="card stat"><span className="num">{workouts.length}</span><span className="muted small">tréninků celkem</span></div>
      </section>

      <section>
        <div className="row-between"><h3 className="section-title">Nedávné rekordy</h3><button className="link" onClick={() => go('stats')}>Všechny statistiky</button></div>
        {recentPrs.length ? (
          <div className="card list">
            {recentPrs.map((p) => (
              <div className="row" key={p.name}>
                <div><div>{p.name}</div><div className="muted small">{fmtDate(p.date)}</div></div>
                <span className="pb">{fmtSet(p.weight, p.reps)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty">Rekordy se objeví po prvním dokončeném tréninku.</p>
        )}
      </section>
    </div>
  );
}
