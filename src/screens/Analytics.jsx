import { useMemo, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { CATEGORIES } from '../data/exercises.js';
import { locale, t } from '../lib/i18n.js';
import { BarChart, HBars, LineChart } from '../components/Charts.jsx';
import WeeklyGoal from '../components/WeeklyGoal.jsx';
import WorkoutLoad from '../components/WorkoutLoad.jsx';
import { computeMetrics } from '../lib/metrics.js';
import { useViewMode } from '../lib/viewMode.js';
import { ArrowIcon } from '../components/Icons.jsx';
import { better, fmtDate, fmtDuration, fmtNum, fmtSet, workoutVolume } from '../lib/util.js';

const WEEK = 7 * 864e5;
const RANGES = [4, 12, 26, 52];
const e1rm = (w, r) => (r <= 1 ? w : w * (1 + r / 30)); // Epley
const GROUP_FALLBACK = { PUSH: 'chest', PULL: 'back', LEGS: 'legs', UPPER: 'back', LOWER: 'legs', ABS: 'abs' };

const monday = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };

export default function Analytics({ go }) {
  const { desktop } = useViewMode();
  // Na mobilu se sem jde z mobilních statistik → odkaz zpět
  const back = !desktop && go ? <button className="back-link" onClick={() => go('stats')}><ArrowIcon width={14} height={14} /> {t('ms.title')}</button> : null;
  const { workouts, prs, catOf, weeklyGoal, setWeeklyGoal, main } = useStore();
  const [range, setRange] = useState(12);

  const inRange = useMemo(() => {
    const from = monday(Date.now()) - (range - 1) * WEEK;
    return workouts.filter((w) => w.startedAt >= from);
  }, [workouts, range]);

  const kpi = useMemo(() => {
    const vol = inRange.reduce((s, w) => s + workoutVolume(w), 0);
    const sets = inRange.reduce((s, w) => s + w.exercises.reduce((n, e) => n + e.sets.length, 0), 0);
    const dur = inRange.length ? inRange.reduce((s, w) => s + (w.finishedAt - w.startedAt), 0) / inRange.length : 0;
    return { count: inRange.length, vol, sets, dur, perWeek: inRange.length / range };
  }, [inRange, range]);

  const weekly = useMemo(() => {
    const first = monday(Date.now()) - (range - 1) * WEEK;
    const buckets = Array.from({ length: range }, (_, i) => ({ t: first + i * WEEK, vol: 0, n: 0 }));
    for (const w of inRange) {
      const i = Math.floor((monday(w.startedAt) - first) / WEEK);
      if (buckets[i]) { buckets[i].vol += workoutVolume(w); buckets[i].n += 1; }
    }
    const lab = (ms) => new Date(ms).toLocaleDateString(locale(), { day: 'numeric', month: 'numeric' });
    return {
      vol: buckets.map((b) => ({ label: lab(b.t), title: t('an.weekOf', { d: lab(b.t) }), value: Math.round(b.vol) })),
      n: buckets.map((b) => ({ label: lab(b.t), title: t('an.weekOf', { d: lab(b.t) }), value: b.n })),
    };
  }, [inRange, range]);

  const muscles = useMemo(() => {
    const m = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
    for (const w of inRange) for (const e of w.exercises) {
      const c = catOf(e.name) || GROUP_FALLBACK[w.group] || 'other';
      m[c] = (m[c] || 0) + e.sets.length;
    }
    return Object.entries(m).map(([c, value]) => ({ label: t('cat.' + c), value })).sort((a, b) => b.value - a.value);
  }, [inRange, catOf]);

  // Globální metriky tréninků (intenzita potřebuje celou historii, zobrazí se jen vybrané období)
  const allMetrics = useMemo(() => computeMetrics(workouts), [workouts]);
  const loadMetrics = useMemo(() => inRange.map((w) => allMetrics.get(w.id)).filter(Boolean).sort((a, b) => a.startedAt - b.startedAt), [inRange, allMetrics]);

  // Cvičení seřazená podle počtu tréninků
  const exList = useMemo(() => {
    const c = {};
    for (const w of workouts) for (const e of w.exercises) c[e.key] = { key: e.key, name: e.name, n: (c[e.key]?.n || 0) + 1 };
    return Object.values(c).sort((a, b) => b.n - a.n);
  }, [workouts]);
  const [exSel, setExSel] = useState(null);
  const sel = exSel || exList[0]?.key;

  const progress = useMemo(() => {
    if (!sel) return null;
    const sessions = [];
    for (const w of [...workouts].reverse()) {
      const e = w.exercises.find((x) => x.key === sel);
      if (!e) continue;
      const top = e.sets.reduce((a, s) => (better(s, a) ? s : a), e.sets[0]);
      sessions.push({
        t: w.startedAt, top, sets: e.sets,
        e1: Math.max(...e.sets.map((s) => e1rm(s.weight, s.reps))),
        vol: e.sets.reduce((s, x) => s + x.weight * x.reps, 0),
      });
    }
    return sessions;
  }, [workouts, sel]);

  if (!workouts.length) {
    return (
      <div className="screen screen-wide">
        {back}
        <header className="screen-head"><h1>{t('an.title')}</h1></header>
        <p className="empty">{t('an.empty')}</p>
      </div>
    );
  }

  const timed = progress?.some((s) => s.top.time > 0);
  const bodyweight = timed || progress?.every((s) => s.top.weight === 0);

  return (
    <div className="screen screen-wide">
      {back}
      <header className="screen-head row-between">
        <h1>{t('an.title')}</h1>
        <div className="seg seg-sm seg-inline" role="radiogroup" aria-label={t('an.period')}>
          {RANGES.map((r) => <button key={r} role="radio" aria-checked={range === r} className={range === r ? 'is-on' : ''} onClick={() => setRange(r)}>{t('an.r' + r)}</button>)}
        </div>
      </header>

      <section className="kpis">
        <div className="card kpi"><span className="label">{t('an.workouts')}</span><span className="num">{kpi.count}</span><span className="muted small">{t('an.perWeek', { n: fmtNum(Math.round(kpi.perWeek * 10) / 10) })}</span></div>
        <div className="card kpi"><span className="label">{t('an.volume')}</span><span className="num">{fmtNum(Math.round(kpi.vol / 100) / 10)}<small> t</small></span><span className="muted small">{t('an.volumeSub')}</span></div>
        <div className="card kpi"><span className="label">{t('an.sets')}</span><span className="num">{kpi.sets}</span><span className="muted small">{t('an.setsSub')}</span></div>
        <div className="card kpi"><span className="label">{t('an.avg')}</span><span className="num">{fmtDuration(kpi.dur)}</span><span className="muted small">{t('an.avgSub')}</span></div>
      </section>

      <div className="an-grid">
        <section className="card span-2">
          <div className="card-head"><h2>{t('an.progress')}</h2>
            <select className="input input-sm" value={sel || ''} onChange={(e) => setExSel(e.target.value)} aria-label={t('an.exercise')}>
              {exList.map((e) => <option key={e.key} value={e.key}>{e.name} ({e.n})</option>)}
            </select>
          </div>
          {progress && (
            <>
              <LineChart
                label={exList.find((e) => e.key === sel)?.name || ''}
                unit={timed ? ' min' : bodyweight ? '' : ' kg'}
                series={bodyweight
                  ? [{ name: timed ? t('an.maxTime') : t('an.maxReps'), points: progress.map((s) => ({ x: s.t, y: timed ? s.top.time : s.top.reps })) }]
                  : [
                      { name: t('an.e1rm'), points: progress.map((s) => ({ x: s.t, y: s.e1 })) },
                      { name: t('an.top'), points: progress.map((s) => ({ x: s.t, y: s.top.weight })) },
                    ]}
              />
              <div className="mini-stats">
                <div><span className="label">{t('an.pb')}</span><span>{prs[sel] ? fmtSet(prs[sel].weight, prs[sel].reps, prs[sel].time) : '–'}</span></div>
                <div><span className="label">{t('an.e1rm')}</span><span>{bodyweight ? '–' : `${fmtNum(Math.round(Math.max(...progress.map((s) => s.e1))))} kg`}</span></div>
                <div><span className="label">{t('an.sessions')}</span><span>{progress.length}</span></div>
                <div><span className="label">{t('an.change')}</span><span>{progress.length > 1 && !bodyweight ? `${progress.at(-1).top.weight - progress[0].top.weight >= 0 ? '+' : ''}${fmtNum(progress.at(-1).top.weight - progress[0].top.weight)} kg` : '–'}</span></div>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>{t('an.date')}</th><th>{t('an.setsCol')}</th><th className="r">{t('an.volCol')}</th></tr></thead>
                  <tbody>
                    {[...progress].reverse().slice(0, 8).map((s) => (
                      <tr key={s.t}><td>{fmtDate(s.t)}</td><td className="mono">{s.sets.map((x) => fmtSet(x.weight, x.reps, x.time)).join(', ')}</td><td className="r mono">{fmtNum(Math.round(s.vol))}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <WorkoutLoad metrics={loadMetrics} />
        <section className="card"><div className="card-head"><h2>{t('an.weeklyVol')}</h2><span className="label">kg</span></div><BarChart label={t('an.weeklyVol')} data={weekly.vol} unit=" kg" format={(v) => (v >= 1000 ? fmtNum(Math.round(v / 100) / 10) + 'k' : fmtNum(Math.round(v)))} /></section>
        <section className="card"><div className="card-head"><h2>{t('an.weeklyN')}</h2></div><BarChart label={t('an.weeklyN')} data={weekly.n} format={(v) => fmtNum(Math.round(v * 10) / 10)} /></section>
        <section className="card"><div className="card-head"><h2>{t('an.muscles')}</h2></div><HBars data={muscles} /></section>
        <WeeklyGoal workouts={workouts} goal={weeklyGoal} setGoal={setWeeklyGoal} groups={main.groups} />

        <section className="card span-2">
          <div className="card-head"><h2>{t('an.prs')}</h2><span className="label">{Object.keys(prs).length}</span></div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t('an.exercise')}</th><th className="r">{t('an.record')}</th><th className="r">{t('an.e1rm')}</th><th className="r">{t('an.date')}</th></tr></thead>
              <tbody>
                {Object.entries(prs).sort((a, b) => b[1].weight - a[1].weight).map(([k, p]) => (
                  <tr key={k} onClick={() => setExSel(k)} className="clickable" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setExSel(k)}>
                    <td>{p.name}</td><td className="r mono">{fmtSet(p.weight, p.reps, p.time)}</td>
                    <td className="r mono">{p.weight ? `${fmtNum(Math.round(e1rm(p.weight, p.reps)))} kg` : '–'}</td>
                    <td className="r mono muted">{fmtDate(p.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
