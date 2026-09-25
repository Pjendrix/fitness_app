// Detail cviku (graf, rekordy, cíl, poslední tréninky). Samostatný soubor, aby panel z tréninku/historie
// nestahoval celé mobilní statistiky do hlavního bundlu (MobileStats zůstává líně načtený).
import { useMemo, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { LineChart } from './Charts.jsx';
import { ArrowIcon, StarIcon } from './Icons.jsx';
import { e1rm } from '../lib/metrics.js';
import { fmtDate, fmtNum, fmtSet, num } from '../lib/util.js';
import { locale, t } from '../lib/i18n.js';
import { exerciseRecords, exerciseTargets, specFromTemplates } from '../lib/progress.js';

export const signed = (n, unit = '') => (n > 0 ? '+' : n < 0 ? '−' : '±') + fmtNum(Math.round(Math.abs(n) * 10) / 10) + unit;
export const trendClass = (n) => (n > 0 ? 'ms-up' : n < 0 ? 'ms-down' : 'muted');
export const shortDate = (ms) => new Date(ms).toLocaleDateString(locale(), { day: 'numeric', month: 'short' });

// Historie jednoho cviku, od nejstarší session. kind: 'e1' (váha), 'reps' (vlastní váha), 'time' (na čas).
export function sessionsOf(workouts, key) {
  const out = [];
  for (let i = workouts.length - 1; i >= 0; i--) {
    const w = workouts[i];
    const e = w.exercises.find((x) => x.key === key);
    if (!e || !e.sets.length) continue;
    const sets = e.sets.map((s) => ({ weight: num(s.weight), reps: num(s.reps), time: num(s.time) }));
    const top = sets.reduce((a, s) => (s.time > a.time || (s.time === a.time && (s.weight > a.weight || (s.weight === a.weight && s.reps > a.reps))) ? s : a), sets[0]);
    out.push({
      t: w.startedAt, name: e.name, sets, top,
      e1: Math.max(...sets.map((s) => e1rm(s.weight, s.reps))),
      vol: sets.reduce((a, s) => a + s.weight * s.reps, 0),
    });
  }
  const kind = out.some((s) => s.top.time > 0) ? 'time' : out.every((s) => s.top.weight === 0) ? 'reps' : 'e1';
  // Váhový cvik: session bez váhy (např. rozcvička BW) by v grafu spadla na nulu → vynechat
  return { list: kind === 'e1' ? out.filter((s) => s.e1 > 0) : out, kind };
}
export const valueOf = (s, kind) => (kind === 'time' ? s.top.time : kind === 'reps' ? s.top.reps : s.e1);
export const unitOf = (kind) => (kind === 'time' ? ' min' : kind === 'reps' ? '' : ' kg');

export function BackLink({ label, onClick }) {
  return <button className="back-link" onClick={onClick}><ArrowIcon width={14} height={14} /> {label}</button>;
}

export function ExerciseDetail({ exKey, onBack, embedded = false }) {
  const { workouts, prs, catOf, pinnedLifts, togglePin, templates, stepOf } = useStore();
  const recs = useMemo(() => exerciseRecords(workouts, exKey), [workouts, exKey]);
  const { list, kind } = useMemo(() => sessionsOf(workouts, exKey), [workouts, exKey]);
  const options = kind === 'e1' ? ['e1', 'top', 'vol'] : [kind];
  const [metric, setMetric] = useState(options[0]);
  const m = options.includes(metric) ? metric : options[0];

  if (!list.length) return <div className={embedded ? 'ms-embed' : 'screen'}>{!embedded && <BackLink label={t('ms.title')} onClick={onBack} />}<p className="empty">{t('an.fewData')}</p></div>;

  const last = list[list.length - 1], first = list[0];
  const name = last.name;
  const pinned = pinnedLifts.includes(exKey);
  const val = (s) => (m === 'e1' ? s.e1 : m === 'top' ? s.top.weight : m === 'vol' ? s.vol : m === 'time' ? s.top.time : s.top.reps);
  const unit = m === 'vol' ? ' kg' : unitOf(m === 'e1' || m === 'top' ? 'e1' : kind);
  const label = { e1: t('an.e1rm'), top: t('an.top'), vol: t('an.volume'), time: t('an.maxTime'), reps: t('an.maxReps') }[m];
  const now = val(last), change = now - val(first);
  const cat = catOf(name);

  // Cíl podle stejného pravidla jako v tréninku (celý poslední trénink, rozsah ze šablony, krok váhy cviku)
  const range = specFromTemplates(templates, exKey);
  const tgs = kind === 'time' ? [] : exerciseTargets(last.sets, { spec: range.spec, to: range.to, step: stepOf(name) });
  const topI = last.sets.reduce((bi, x, i, a) => (x.weight > a[bi].weight || (x.weight === a[bi].weight && x.reps > a[bi].reps) ? i : bi), 0);
  const tg = tgs[topI];
  const target = { main: tg ? fmtSet(tg.weight, tg.reps) : '–', alt: null };
  const pb = prs[exKey];

  return (
    <div className={embedded ? 'ms ms-embed' : 'screen ms'}>
      <header className="screen-head ms-head">
        {!embedded && <BackLink label={t('ms.title')} onClick={onBack} />}
        <div className="ms-title ms-title-ex">
          <h1>{name}</h1>
          <button className={'icon-btn ms-star' + (pinned ? ' is-on' : '')} aria-pressed={pinned} aria-label={pinned ? t('ms.unpin') : t('ms.pin')} title={pinned ? t('ms.unpin') : t('ms.pin')} onClick={() => togglePin(exKey)}>
            <StarIcon width={20} height={20} />
          </button>
        </div>
        <p className="label">{[cat && cat !== 'other' ? t('cat.' + cat) : null, t('ms.nSessions', { n: list.length }), t('ms.since', { d: shortDate(first.t) })].filter(Boolean).join(' · ')}</p>
      </header>

      <section className="card">
        {options.length > 1 && (
          <div className="seg seg-sm" role="radiogroup" aria-label={t('ms.metric')}>
            {options.map((o) => <button key={o} role="radio" aria-checked={m === o} className={m === o ? 'is-on' : ''} onClick={() => setMetric(o)}>{{ e1: t('an.e1rm'), top: t('an.top'), vol: t('an.volume') }[o]}</button>)}
          </div>
        )}
        <div className="ms-now">
          <span className="num">{fmtNum(Math.round(now * 10) / 10)}<small>{unit}</small></span>
          {list.length > 1 && <span className={'mono small ' + trendClass(change)}>{signed(change, unit)} · {t('ms.since', { d: shortDate(first.t) })}</span>}
        </div>
        <LineChart label={name} unit={unit} height={180} series={[{ name: label, points: list.map((s) => ({ x: s.t, y: val(s) })) }]} />
      </section>

      <section className="kpis">
        <div className="card kpi"><span className="label">{t('an.pb')}</span><span className="num ms-set">{pb ? fmtSet(pb.weight, pb.reps, pb.time) : '–'}</span><span className="muted small">{pb ? shortDate(pb.date) : ''}</span></div>
        <div className="card kpi"><span className="label">{t('ms.target')}</span><span className="num ms-set">{target.main}</span><span className="muted small">{t('ms.targetSub')}</span></div>
      </section>

      {(recs.e1 || recs.reps.length > 0) && (
        <section className="card ms-flush">
          <div className="card-head ms-pad"><h2>{t('rec.title')}</h2></div>
          {recs.e1 && <div className="ms-sess"><div className="row-between"><span>{t('an.e1rm')}</span><span className="mono">{fmtNum(recs.e1.value)} kg</span></div><span className="mono small muted">{fmtSet(recs.e1.weight, recs.e1.reps)} · {shortDate(recs.e1.date)}</span></div>}
          {recs.reps.map((r) => (
            <div key={r.weight} className="ms-sess"><div className="row-between"><span>{t('rec.mostAt', { w: fmtNum(r.weight) })}</span><span className="mono">{t('rec.nReps', { n: r.reps })}</span></div><span className="mono small muted">{shortDate(r.date)}</span></div>
          ))}
        </section>
      )}

      <section className="card ms-flush">
        <div className="card-head ms-pad"><h2>{t('ms.recent')}</h2><span className="label">{t('an.top')}</span></div>
        {[...list].reverse().slice(0, 5).map((s) => (
          <div key={s.t} className="ms-sess">
            <div className="row-between"><span>{fmtDate(s.t)}</span><span className="mono">{fmtSet(s.top.weight, s.top.reps, s.top.time)}</span></div>
            <span className="mono small muted">{s.sets.map((x) => fmtSet(x.weight, x.reps, x.time)).join(' · ')}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
