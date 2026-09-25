import { useMemo, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { computeMetrics, previousSame } from '../lib/metrics.js';
import { recordsTimeline } from '../lib/progress.js';
import { fmtDate, fmtDuration, fmtNum, fmtSet, workoutVolume } from '../lib/util.js';
import { t } from '../lib/i18n.js';
import { ContactSheet } from './DemoBar.jsx';
import { TrophyIcon } from './Icons.jsx';

export const recordText = (r) => (r.kind === 'pb' ? `PB ${fmtSet(r.weight, r.reps, r.time)}` : r.kind === 'e1' ? t('rec.e1', { v: fmtNum(r.e1) }) : t('rec.reps', { r: r.reps, w: fmtNum(r.weight) }));

// W3: souhrn po dokončení tréninku (+ O5: nabídka vlastní verze v demu)
export default function WorkoutSummary({ done, onClose }) {
  const { workouts, mode } = useStore();
  const [contact, setContact] = useState(false);
  const all = useMemo(() => (workouts.some((w) => w.id === done.id) ? workouts : [done, ...workouts]), [workouts, done]);
  const records = useMemo(() => recordsTimeline(all).get(done.id) || [], [all, done.id]);
  const prev = useMemo(() => previousSame(done, all), [done, all]);
  const m = useMemo(() => computeMetrics(all), [all]);
  const cur = m.get(done.id), pm = prev ? m.get(prev.id) : null;
  const sets = done.exercises.reduce((n, e) => n + e.sets.length, 0);
  const vol = workoutVolume(done);
  const delta = (a, b, unit = '', neutral = false) => {
    if (b == null || a == null) return null;
    const d = Math.round((a - b) * 10) / 10;
    return <span className={neutral || d === 0 ? 'muted' : d > 0 ? 'ms-up' : 'ms-down'}>{d > 0 ? '+' : d < 0 ? '−' : '±'}{fmtNum(Math.abs(d))}{unit}</span>;
  };
  return (
    <div className="screen summary">
      <header className="screen-head">
        <p className="label">{t('sum.eyebrow')}</p>
        <h1>{done.name}</h1>
        <p className="muted small">{fmtDate(done.startedAt)}</p>
      </header>
      <section className="kpis">
        <div className="card kpi"><span className="label">{t('wl.m.minutes')}</span><span className="num">{fmtDuration(done.finishedAt - done.startedAt)}</span><span className="small">{pm && delta(Math.round(cur?.minutes || 0), Math.round(pm.minutes), ' min', true)}</span></div>
        <div className="card kpi"><span className="label">{t('an.volume')}</span><span className="num">{fmtNum(Math.round(vol))}<small> kg</small></span><span className="small">{pm && delta(Math.round(vol), Math.round(pm.volume), ' kg')}</span></div>
        <div className="card kpi"><span className="label">{t('an.sets')}</span><span className="num">{sets}</span><span className="small">{pm && delta(sets, pm.sets)}</span></div>
        <div className="card kpi"><span className="label">{t('sum.records')}</span><span className="num">{records.length}</span><span className="muted small">{t('sum.recordsSub')}</span></div>
      </section>
      {pm && <p className="muted small">{t('sum.vsPrev', { d: fmtDate(prev.startedAt) })}</p>}
      {records.length > 0 && (
        <section className="card ms-flush">
          <div className="card-head ms-pad"><h2>{t('sum.newRecords')}</h2></div>
          {records.map((r) => (
            <div key={r.key} className="sum-rec"><TrophyIcon width={18} height={18} /><span className="grow">{r.name}</span><span className="pb">{recordText(r)}</span></div>
          ))}
        </section>
      )}
      <section className="card ms-flush">
        {done.exercises.map((e) => (
          <div key={e.key} className="ms-sess">
            <div className="row-between"><span>{e.name}</span>{e.rpe ? <span className="mono small muted">RPE {e.rpe}</span> : null}</div>
            <span className="mono small muted">{e.sets.map((s) => fmtSet(s.weight, s.reps, s.time)).join(' · ')}</span>
          </div>
        ))}
      </section>
      {mode === 'demo' && (
        <section className="card sum-cta">
          <h2>{t('sum.ctaTitle')}</h2>
          <p className="muted small">{t('sum.ctaText')}</p>
          <button className="btn btn-primary btn-block" onClick={() => setContact(true)}>{t('demo.want')}</button>
        </section>
      )}
      <button className="btn btn-finish btn-lg btn-block" onClick={onClose}>{t('sum.done')}</button>
      {contact && <ContactSheet onClose={() => setContact(false)} />}
    </div>
  );
}
