import { useMemo, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { previousSame } from '../lib/metrics.js';
import { metricsOf, recordsOf } from '../lib/derived.js';
import { exerciseTrend, fmtRest, groupSets, setNotes, withRpe } from '../lib/body.js';
import { fmtDate, fmtDuration, fmtNum, fmtSet, workoutVolume } from '../lib/util.js';
import { t } from '../lib/i18n.js';
import { effTime } from '../lib/breaks.js';
import { COMEBACK_DAYS } from '../lib/gamify.js';
import { ContactSheet } from './DemoBar.jsx';
import { RepeatIcon, TrashIcon, TrophyIcon } from './Icons.jsx';

export const recordText = (r) => (r.kind === 'pb' ? `${t('rec.max')} ${fmtSet(r.weight, r.reps, r.time)}` : r.kind === 'e1' ? t('rec.e1', { v: fmtNum(r.e1) }) : t('rec.reps', { r: r.reps, w: fmtNum(r.weight) }));

// Minulý výskyt cviku před tímto tréninkem (all je od nejnovějšího)
const prevSetsOf = (all, w, key) => {
  for (const x of all) {
    if (x.id === w.id || x.startedAt >= w.startedAt) continue;
    const e = x.exercises.find((y) => y.key === key);
    if (e?.sets.length) return e.sets;
  }
  return null;
};
// „4 × 6 · 70 kg“ pro stejné série, jinak jednotlivě
const setsText = (sets) => groupSets(sets).map(({ n, set }) => {
  const one = withRpe(fmtSet(set.weight, set.reps, set.time), set);
  return n > 1 ? `${n} × ${one}` : one;
}).join(' · ');
const trendText = (tr) => (tr.dir === 0 ? t('sum.same') : `${tr.dir > 0 ? '▲ +' : '▼ −'}${fmtNum(tr.diff)} ${tr.kind === 'reps' ? t('sum.reps', { n: tr.diff }) : tr.kind}`);

// W3: souhrn tréninku – po dokončení i z Historie (actions = Upravit / Zopakovat / Smazat)
// embedded = panel v desktopové Historii (bez obalu obrazovky a bez tlačítka Zavřít)
export default function WorkoutSummary({ done, onClose, actions = null, embedded = false }) {
  const { workouts, mode, breaks } = useStore();
  const [contact, setContact] = useState(false);
  const all = useMemo(() => (workouts.some((w) => w.id === done.id) ? workouts : [done, ...workouts]), [workouts, done]);
  const records = useMemo(() => recordsOf(all).get(done.id) || [], [all, done.id]);
  const prev = useMemo(() => previousSame(done, all), [done, all]);
  // Návrat po ≥ 7 dnech bez tréninku → „Vítej zpátky“ (návrat je to nejdůležitější, ne výkon)
  // Stejný „tréninkový čas“ jako Heat a milník Návrat: zapsaná pauza se do mezery nepočítá → pak „Pauza skončila“
  const back = useMemo(() => {
    const before = all.filter((x) => x.id !== done.id && x.startedAt < done.startedAt).reduce((a, x) => Math.max(a, x.startedAt), 0);
    if (!(before > 0) || done.startedAt - before < COMEBACK_DAYS * 864e5) return null;
    const eff = effTime(breaks);
    return eff(done.startedAt) - eff(before) >= COMEBACK_DAYS * 864e5 ? 'back' : 'pause';
  }, [all, done, breaks]);
  const m = metricsOf(all);
  const cur = m.get(done.id), pm = prev ? m.get(prev.id) : null;
  const sets = done.exercises.reduce((n, e) => n + e.sets.length, 0);
  const vol = workoutVolume(done);
  const delta = (d, unit = '', neutral = false) => {
    if (d == null || !Number.isFinite(d)) return <span className="muted">&nbsp;</span>;
    const r = Math.round(d * 10) / 10;
    return <span className={neutral || r === 0 ? 'muted' : r > 0 ? 'ms-up' : 'ms-down'}>{r > 0 ? '+' : r < 0 ? '−' : '±'}{fmtNum(Math.abs(r))}{unit}</span>;
  };
  return (
    <div className={embedded ? 'summary sum-embed' : 'screen summary'}>
      <header className="screen-head">
        <p className="label">{actions ? fmtDate(done.startedAt) : `${back === 'back' ? t('sum.back') : back === 'pause' ? t('sum.afterPause') : t('sum.eyebrow')} · ${fmtDate(done.startedAt)}`}</p>
        <h1>{done.name}</h1>
      </header>
      <section className="card sum-stats">
        <div className="sum-stat"><span className="num">{fmtDuration(done.finishedAt - done.startedAt)}</span>{pm ? delta(Math.round(cur?.minutes || 0) - Math.round(pm.minutes), ' min', true) : delta(null)}</div>
        <div className="sum-stat"><span className="num">{fmtNum(Math.round(vol))}<small> kg</small></span>{pm && pm.volume ? delta(Math.round(((vol / pm.volume) - 1) * 100), ' %') : delta(null)}</div>
        <div className="sum-stat"><span className="num">{sets}<small> {t('count.sets', { n: sets }).replace(/^\d+\s*/, '')}</small></span>{pm ? delta(sets - pm.sets) : delta(null)}</div>
        {(pm || cur?.rest != null) && (
          <p className="muted small sum-foot">{[cur?.rest != null && t('sum.rest', { t: fmtRest(cur.rest) }), pm && t('sum.vsPrev', { d: fmtDate(prev.startedAt) })].filter(Boolean).join(' · ')}</p>
        )}
      </section>
      {records.length > 0 && (
        <section className="card ms-flush">
          <div className="card-head ms-pad"><h2><TrophyIcon width={16} height={16} /> {t('sum.newRecords')}</h2></div>
          {records.map((r) => (
            <div key={r.key} className="sum-rec"><span className="grow">{r.name}</span><span className="pb">{recordText(r)}</span></div>
          ))}
        </section>
      )}
      <section className="card ms-flush">
        {done.exercises.map((e) => {
          const tr = exerciseTrend(e.sets, prevSetsOf(all, done, e.key));
          return (
            <div key={e.key} className="sum-ex">
              <div className="sum-ex-head">
                <span>{e.name}</span>
                {tr && <span className={'mono small ' + (tr.dir > 0 ? 'ms-up' : tr.dir < 0 ? 'ms-down' : 'muted')}>{trendText(tr)}</span>}
              </div>
              <span className="mono small muted">{setsText(e.sets)}{e.rpe ? ` · RPE ${e.rpe}` : ''}</span>
              {e.note && <span className="small muted">{e.note}</span>}
              {setNotes(e.sets).map((x) => <span key={x.n} className="small muted sum-note"><b>{x.n}.</b> {x.note}</span>)}
            </div>
          );
        })}
      </section>
      {(mode === 'demo' || mode === 'trial') && !actions && (
        <section className="card sum-cta">
          <h2>{t(mode === 'trial' ? 'trial.ctaTitle' : 'sum.ctaTitle')}</h2>
          <p className="muted small">{t(mode === 'trial' ? 'trial.ctaText' : 'sum.ctaText')}</p>
          <button className="btn btn-primary btn-block" onClick={() => setContact(true)}>{t(mode === 'trial' ? 'trial.request' : 'demo.want')}</button>
        </section>
      )}
      {actions ? (
        <>
          <div className="row-actions sum-actions">
            <button className="btn btn-primary btn-sm" onClick={actions.repeat}><RepeatIcon width={16} height={16} /> {t('hist.repeat')}</button>
            <button className="btn btn-ghost btn-sm" onClick={actions.edit}>{t('hist.edit')}</button>
            <button className="btn btn-danger btn-sm" onClick={actions.remove}><TrashIcon width={16} height={16} /> {t('hist.delete')}</button>
          </div>
          {!embedded && <button className="btn btn-ghost btn-block" onClick={onClose}>{t('pick.close')}</button>}
        </>
      ) : <button className="btn btn-finish btn-lg btn-block" onClick={onClose}>{t('sum.done')}</button>}
      {contact && <ContactSheet kind={mode === 'trial' ? 'access' : 'offer'} onClose={() => setContact(false)} />}
    </div>
  );
}
