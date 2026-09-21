import { useMemo, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import ViewToggle from '../components/ViewToggle.jsx';
import { GROUP_ORDER } from '../data/defaultTemplates.js';
import { fmtDate, fmtNum, fmtSet, startOfWeek, workoutVolume } from '../lib/util.js';
import { t } from '../lib/i18n.js';

export default function Home({ go }) {
  const { user, workouts, prs, templates, active, startWorkout, startEmptyWorkout } = useStore();
  const [variant, setVariant] = useState('Normal');

  // Next in the PUSH → PULL → LEGS rotation based on the last workout
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

  const recentPrs = useMemo(() => Object.values(prs).sort((a, b) => b.date - a.date).slice(0, 3), [prs]);

  const tpl = templates.find((x) => x.group === group && x.variant === variant);
  const first = (user?.name || '').split(' ')[0];

  return (
    <div className="screen">
      <header className="screen-head">
        <div className="row-between"><p className="muted">{first ? t('home.hiName', { name: first }) : t('home.hi')}</p><ViewToggle /></div>
        <h1>{t('home.title')}</h1>
      </header>

      {active ? (
        <section className="card card-hero">
          <p className="label">{t('home.unfinished')}</p>
          <h2 className="big">{active.name}</h2>
          <button className="btn btn-primary btn-block" onClick={() => go('workout')}>{t('home.continue')}</button>
        </section>
      ) : (
        <section className="card card-hero">
          <p className="label">{t('home.quickStart')}{group === next ? ` · ${t('home.upNext')}` : ''}</p>
          <div className="seg" role="tablist">
            {GROUP_ORDER.map((g) => (
              <button key={g} role="tab" aria-selected={group === g} className={group === g ? 'is-on' : ''} onClick={() => setGroup(g)}>{g}</button>
            ))}
          </div>
          <p className="group-sub">{t('groups.' + group)}</p>
          <div className="seg seg-sm" role="tablist">
            {['Normal', 'Hardcore'].map((v) => (
              <button key={v} role="tab" aria-selected={variant === v} className={variant === v ? 'is-on' : ''} onClick={() => setVariant(v)}>{v}</button>
            ))}
          </div>
          <p className="label">{t('count.exercises', { n: tpl.exercises.length })} · {t('count.sets', { n: tpl.exercises.reduce((s, e) => s + e.sets, 0) })}</p>
          <button className="btn btn-primary btn-block" onClick={() => { startWorkout(tpl); go('workout'); }}>{t('home.start', { name: tpl.name })}</button>
        </section>
      )}

      <section className="stats" onClick={() => go('stats')} role="button" tabIndex={0} aria-label={t('home.openStats')}>
        <div className="card stat"><span className="num">{week.count}</span><span className="muted small">{t('home.weekWorkouts')}</span></div>
        <div className="card stat"><span className="num">{week.volume ? fmtNum(Math.round(week.volume / 100) / 10) : 0}<small> t</small></span><span className="muted small">{t('home.weekVolume')}</span></div>
        <div className="card stat"><span className="num">{workouts.length}</span><span className="muted small">{t('home.total')}</span></div>
      </section>

      {!active && (
        <button className="btn btn-primary btn-block btn-lg" onClick={() => { startEmptyWorkout(); go('workout'); }}>{t('home.empty')}</button>
      )}

      <section>
        <div className="row-between"><h3 className="section-title">{t('home.recentPrs')}</h3><button className="link" onClick={() => go('stats')}>{t('home.allStats')}</button></div>
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
          <p className="empty">{t('home.noPrs')}</p>
        )}
      </section>
    </div>
  );
}
