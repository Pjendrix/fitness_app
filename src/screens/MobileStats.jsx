// Mobilní statistiky: jednoduchý přehled + detail cviku. Plná analytika zůstává na desktopu (Analytics.jsx).
import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { LineChart } from '../components/Charts.jsx';
import { ArrowIcon, MonitorIcon, SearchIcon, StarIcon } from '../components/Icons.jsx';
import { CATEGORIES } from '../data/exercises.js';
import { e1rm } from '../lib/metrics.js';
import { fmtDate, fmtDuration, fmtNum, fmtSet, num, startOfWeek, workoutVolume } from '../lib/util.js';
import { locale, t } from '../lib/i18n.js';
import { exerciseRecords, nextTarget, specFromTemplates } from '../lib/progress.js';
import Sheet from '../components/Sheet.jsx';
import { markGuide } from '../lib/guide.js';
import { norm } from '../components/ExercisePicker.jsx';

const DAY = 864e5, WEEK = 7 * DAY;
const RANGES = [4, 12, 26, 52];
const GROUP_FALLBACK = { PUSH: 'chest', PULL: 'back', LEGS: 'legs', UPPER: 'back', LOWER: 'legs', ABS: 'abs' };
const monday = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };
const signed = (n, unit = '') => (n > 0 ? '+' : n < 0 ? '−' : '±') + fmtNum(Math.round(Math.abs(n) * 10) / 10) + unit;
const trendClass = (n) => (n > 0 ? 'ms-up' : n < 0 ? 'ms-down' : 'muted');
const shortDate = (ms) => new Date(ms).toLocaleDateString(locale(), { day: 'numeric', month: 'short' });

// Historie jednoho cviku, od nejstarší session. kind: 'e1' (váha), 'reps' (vlastní váha), 'time' (na čas).
function sessionsOf(workouts, key) {
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
const valueOf = (s, kind) => (kind === 'time' ? s.top.time : kind === 'reps' ? s.top.reps : s.e1);
const unitOf = (kind) => (kind === 'time' ? ' min' : kind === 'reps' ? '' : ' kg');

function Sparkline({ values }) {
  if (values.length < 2) return <svg className="ms-spark" viewBox="0 0 64 24" aria-hidden="true" />;
  const mn = Math.min(...values), mx = Math.max(...values), span = mx - mn || 1;
  const pts = values.map((v, i) => `${(2 + (i * 60) / (values.length - 1)).toFixed(1)},${(21 - ((v - mn) / span) * 18).toFixed(1)}`).join(' ');
  return <svg className="ms-spark" viewBox="0 0 64 24" aria-hidden="true"><polyline points={pts} /></svg>;
}

function BackLink({ label, onClick }) {
  return <button className="back-link" onClick={onClick}><ArrowIcon width={14} height={14} /> {label}</button>;
}

export default function MobileStats({ go }) {
  const [detail, setDetail] = useState(null);
  useEffect(() => { markGuide('stats'); }, []);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [detail]);
  if (detail) return <ExerciseDetail exKey={detail} onBack={() => setDetail(null)} />;
  return <Overview go={go} open={setDetail} />;
}

function Overview({ go, open }) {
  const { workouts, prs, catOf, weeklyGoal, main, groupLabel, pinnedLifts } = useStore();
  const [range, setRange] = useState(12);
  const [mMode, setMMode] = useState('sets');
  const [allOpen, setAllOpen] = useState(false);
  const allList = useMemo(() => {
    const m = new Map();
    for (const w of workouts) for (const e of w.exercises) {
      const cur = m.get(e.key);
      if (cur) cur.n++; else m.set(e.key, { key: e.key, name: e.name, n: 1, last: w.startedAt });
    }
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [workouts]);

  const data = useMemo(() => {
    const now = Date.now();
    const from = monday(now) - (range - 1) * WEEK, prevFrom = from - range * WEEK;
    const inRange = workouts.filter((w) => w.startedAt >= from);
    const prev = workouts.filter((w) => w.startedAt >= prevFrom && w.startedAt < from);
    const vol = inRange.reduce((s, w) => s + workoutVolume(w), 0);
    const prevVol = prev.reduce((s, w) => s + workoutVolume(w), 0);
    const avg = inRange.length ? inRange.reduce((s, w) => s + (w.finishedAt - w.startedAt), 0) / inRange.length : 0;

    // Série splněných týdnů (aktuální týden se počítá, jen když už je splněný) – stejně jako WeeklyGoal
    const byWeek = new Map();
    for (const w of workouts) { const m = monday(w.startedAt); byWeek.set(m, (byWeek.get(m) || 0) + 1); }
    const cur = monday(now);
    let streak = (byWeek.get(cur) || 0) >= weeklyGoal ? 1 : 0;
    for (let m = monday(cur - DAY); (byWeek.get(m) || 0) >= weeklyGoal; m = monday(m - DAY)) streak++;

    return {
      from, inRange,
      kpi: { count: inRange.length, perWeek: inRange.length / range, vol, volDelta: prevVol ? Math.round(((vol - prevVol) / prevVol) * 100) : null, avg, streak },
    };
  }, [workouts, range, weeklyGoal]);

  // Tento týden po dnech + další skupina v rotaci
  const week = useMemo(() => {
    const start = startOfWeek();
    const today = (new Date().getDay() + 6) % 7;
    const days = Array.from({ length: 7 }, (_, i) => ({ i, list: [] }));
    for (const w of workouts) {
      if (w.startedAt < start) break; // historie je od nejnovější
      days[Math.min(6, Math.floor((w.startedAt - start) / DAY))].list.push(w);
    }
    const G = main.groups.map((g) => g.id).filter((id) => main.templates.some((x) => x.group === id));
    const last = workouts.find((w) => G.includes(w.group));
    const next = last ? G[(G.indexOf(last.group) + 1) % G.length] : G[0];
    const lastOfNext = next ? workouts.find((w) => w.group === next) : null;
    return {
      today, count: days.reduce((n, d) => n + d.list.length, 0),
      days: days.map((d) => ({ ...d, tag: d.list.length ? (groupLabel(d.list[0].group) || '•').slice(0, 1).toUpperCase() : '' })),
      next: next ? groupLabel(next) : null,
      nextDays: lastOfNext ? Math.floor((Date.now() - lastOfNext.startedAt) / DAY) : null,
    };
  }, [workouts, main, groupLabel]);

  // Key lifts: připnuté + nejčastější do 5
  const lifts = useMemo(() => {
    const freq = new Map();
    for (const w of workouts) for (const e of w.exercises) freq.set(e.key, (freq.get(e.key) || 0) + 1);
    const pinned = pinnedLifts.filter((k) => freq.has(k));
    const auto = [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k).filter((k) => !pinned.includes(k));
    return [...pinned, ...auto].slice(0, 5).map((key) => {
      const { list, kind } = sessionsOf(workouts, key);
      const last = list[list.length - 1];
      const inR = list.filter((s) => s.t >= data.from);
      const delta = inR.length > 1 ? valueOf(inR[inR.length - 1], kind) - valueOf(inR[0], kind) : null;
      return {
        key, kind, name: last.name, pinned: pinned.includes(key),
        spark: list.slice(-10).map((s) => valueOf(s, kind)),
        value: fmtNum(Math.round(valueOf(last, kind) * 10) / 10) + unitOf(kind),
        delta,
      };
    });
  }, [workouts, pinnedLifts, data.from]);

  // Svalová rovnováha: série v období, nebo série/týden vs dlouhodobý průměr
  const muscles = useMemo(() => {
    const count = (list) => {
      const m = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
      for (const w of list) for (const e of w.exercises) {
        const c = catOf(e.name) || GROUP_FALLBACK[w.group] || 'other';
        m[c] = (m[c] || 0) + e.sets.length;
      }
      return m;
    };
    // Průměr = týdny PŘED vybraným obdobím (jinak by se období porovnávalo samo se sebou)
    const now = Date.now();
    const r = count(data.inRange), all = count(workouts);
    const base = count(workouts.filter((w) => w.startedAt < data.from));
    const oldest = workouts.length ? workouts[workouts.length - 1].startedAt : now;
    const baseWeeks = (data.from - monday(oldest)) / WEEK;
    const rangeWeeks = Math.max(1, (now - data.from) / WEEK); // rozběhnutý týden jen poměrně
    const rows = Object.keys(all).filter((c) => all[c] > 0).map((c) => {
      const avgWeek = baseWeeks >= 2 ? base[c] / baseWeeks : 0;
      return { c, label: t('cat.' + c), sets: r[c], pct: avgWeek ? Math.round(((r[c] / rangeWeeks) / avgWeek - 1) * 100) : null };
    }).sort((a, b) => b.sets - a.sets);
    const max = Math.max(1, ...rows.map((x) => x.sets));
    const fewest = rows.filter((x) => x.c !== 'cardio').at(-1);
    const lowest = rows.filter((x) => x.c !== 'cardio' && x.pct != null).sort((a, b) => a.pct - b.pct)[0];
    return { rows, max, fewest, lowest, noBase: rows.every((x) => x.pct == null) };
  }, [data.inRange, data.from, workouts, catOf]);

  const recentPrs = useMemo(() => Object.entries(prs).map(([key, p]) => ({ key, ...p })).sort((a, b) => b.date - a.date).slice(0, 3), [prs]);

  const head = (
    <header className="screen-head ms-head">
      <BackLink label={t('nav.home')} onClick={() => go('home')} />
      <div className="ms-title">
        <h1>{t('ms.title')}</h1>
        <div className="seg seg-sm seg-inline" role="radiogroup" aria-label={t('an.period')}>
          {RANGES.map((r) => <button key={r} role="radio" aria-checked={range === r} className={range === r ? 'is-on' : ''} onClick={() => setRange(r)}>{t('an.r' + r)}</button>)}
        </div>
      </div>
    </header>
  );

  if (!workouts.length) return <div className="screen">{head}<p className="empty">{t('an.empty')}</p></div>;
  const k = data.kpi;

  return (
    <div className="screen ms">
      {head}

      <section className="kpis">
        <div className="card kpi"><span className="label">{t('an.workouts')}</span><span className="num">{k.count}</span><span className="muted small">{t('an.perWeek', { n: fmtNum(Math.round(k.perWeek * 10) / 10) })}</span></div>
        <div className="card kpi"><span className="label">{t('an.volume')}</span><span className="num">{fmtNum(Math.round(k.vol / 100) / 10)}<small> t</small></span>
          <span className={'small ' + (k.volDelta == null ? 'muted' : trendClass(k.volDelta))}>{k.volDelta == null ? t('an.volumeSub') : t('ms.vsPrev', { d: signed(k.volDelta, ' %') })}</span></div>
        <div className="card kpi"><span className="label">{t('wg.streak')}</span><span className="num">{k.streak}<small> {t('wg.weeks', { n: k.streak })}</small></span><span className="muted small">{t('wg.streakSub')}</span></div>
        <div className="card kpi"><span className="label">{t('an.avg')}</span><span className="num">{fmtDuration(k.avg)}</span><span className="muted small">{t('an.avgSub')}</span></div>
      </section>

      <section className="card">
        <div className="card-head"><h2>{t('wg.thisWeek')}</h2><span className="label">{t('ms.goalOf', { n: week.count, g: weeklyGoal })}</span></div>
        <div className="ms-week">
          {week.days.map((d) => (
            <div key={d.i} className="ms-day">
              <span className={'ms-dot' + (d.list.length ? ' is-done' : '') + (d.i === week.today ? ' is-today' : '')}>{d.tag}</span>
              <span className="ms-dow">{t('ms.dow').split(',')[d.i]}</span>
            </div>
          ))}
        </div>
        {week.next && (
          <p className="muted small ms-next">
            {t('ms.nextUp')} <b>{week.next}</b> · {week.nextDays == null ? t('ms.never') : week.nextDays === 0 ? t('ms.lastToday') : t('ms.lastAgo', { n: week.nextDays })}
          </p>
        )}
      </section>

      <section className="card ms-flush">
        <div className="card-head ms-pad"><h2>{t('ms.keyLifts')}</h2><span className="label">{t('ms.current')}</span></div>
        {lifts.map((l) => (
          <button key={l.key} className="ms-lift" onClick={() => open(l.key)}>
            <span className="ms-lift-name">
              <span>{l.pinned && <StarIcon className="ms-pin" width={12} height={12} aria-label={t('ms.pinned')} />}{l.name}</span>
              <span className="label">{l.kind === 'e1' ? t('an.e1rm') : l.kind === 'time' ? t('an.maxTime') : t('an.maxReps')}</span>
            </span>
            <Sparkline values={l.spark} />
            <span className="ms-lift-val">
              <span className="mono">{l.value}</span>
              <span className={'mono small ' + (l.delta == null ? 'muted' : trendClass(l.delta))}>{l.delta == null ? '–' : signed(l.delta)}</span>
            </span>
            <ArrowIcon width={14} height={14} className="ms-chev" />
          </button>
        ))}
        <button className="ms-all" onClick={() => setAllOpen(true)}><SearchIcon width={16} height={16} /> {t('ms.allEx', { n: allList.length })}</button>
        <p className="muted small ms-pad ms-foot">{t('ms.pinHint')}</p>
      </section>
      {allOpen && <AllExercises list={allList} onClose={() => setAllOpen(false)} onPick={(k) => { setAllOpen(false); open(k); }} />}

      <section className="card">
        <div className="card-head">
          <h2>{t('ms.muscles')}</h2>
          <div className="seg seg-sm seg-inline" role="radiogroup" aria-label={t('ms.muscles')}>
            <button role="radio" aria-checked={mMode === 'sets'} className={mMode === 'sets' ? 'is-on' : ''} onClick={() => setMMode('sets')}>{t('ms.mSets')}</button>
            <button role="radio" aria-checked={mMode === 'avg'} className={mMode === 'avg' ? 'is-on' : ''} onClick={() => setMMode('avg')}>{t('ms.mAvg')}</button>
          </div>
        </div>
        <div className="hbars">
          {muscles.rows.map((m) => (
            <div key={m.c} className="hbar">
              <span className="muted">{m.label}</span>
              {mMode === 'sets'
                ? <span className="hbar-track"><i style={{ width: `${(m.sets / muscles.max) * 100}%` }} /></span>
                : <span className="hbar-track ms-div">{m.pct != null && <i className={m.pct < 0 ? 'is-neg' : ''} style={m.pct < 0 ? { right: '50%', width: `${Math.min(50, -m.pct / 2)}%` } : { left: '50%', width: `${Math.min(50, m.pct / 2)}%` }} />}</span>}
              <span className={'hbar-val mono ' + (mMode === 'avg' && m.pct != null ? trendClass(m.pct) : '')}>{mMode === 'sets' ? m.sets : m.pct == null ? '–' : signed(m.pct, '%')}</span>
            </div>
          ))}
        </div>
        <p className="muted small ms-note">
          {mMode === 'sets'
            ? muscles.fewest && t('ms.fewest', { cat: muscles.fewest.label })
            : muscles.noBase ? t('ms.noBase') : <>{t('ms.avgNote')}{muscles.lowest && muscles.lowest.pct < 0 && <> · {t('ms.below', { cat: muscles.lowest.label, p: -muscles.lowest.pct })}</>}</>}
        </p>
      </section>

      <section>
        <div className="row-between"><h3 className="section-title">{t('home.recentPrs')}</h3><span className="label">{t('ms.total', { n: Object.keys(prs).length })}</span></div>
        {recentPrs.length ? (
          <div className="card ms-flush">
            {recentPrs.map((p) => (
              <button className="ms-lift ms-pr" key={p.key} onClick={() => open(p.key)}>
                <span className="ms-lift-name"><span>{p.name}</span><span className="muted small">{fmtDate(p.date)}</span></span>
                <span className="pb">{fmtSet(p.weight, p.reps, p.time)}</span>
              </button>
            ))}
          </div>
        ) : <p className="empty">{t('home.noPrs')}</p>}
      </section>

      <section className="ms-full">
        <p className="small">{t('ms.fullText')}</p>
        <button className="btn btn-ghost btn-block" onClick={() => go('statsFull')}><MonitorIcon width={16} height={16} /> {t('ms.fullBtn')}</button>
      </section>
    </div>
  );
}

export function ExerciseDetail({ exKey, onBack, embedded = false }) {
  const { workouts, prs, catOf, pinnedLifts, togglePin, templates } = useStore();
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

  // Cíl podle stejného pravidla jako v tréninku (rozsah opakování ze šablony, jinak 8–12)
  const tg = nextTarget(last.top, specFromTemplates(templates, exKey));
  const target = kind === 'time'
    ? { main: '–', alt: null }
    : tg ? { main: fmtSet(tg.weight, tg.reps), alt: null } : { main: '–', alt: null };
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

// H7: všechny cviky z historie s vyhledáváním
function AllExercises({ list, onClose, onPick }) {
  const { prs } = useStore();
  const [q, setQ] = useState('');
  const query = norm(q.trim());
  const shown = list.filter((e) => norm(e.name).includes(query));
  return (
    <Sheet label={t('ms.allTitle')} onClose={onClose}>
      <div className="sheet-head"><h2>{t('ms.allTitle')}</h2><button className="btn btn-ghost btn-sm" onClick={onClose}>{t('pick.close')}</button></div>
      <input className="input" type="search" maxLength={80} placeholder={t('pick.search')} aria-label={t('pick.search')} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="sheet-list">
        {shown.map((e) => (
          <button key={e.key} className="pick" onClick={() => onPick(e.key)}>
            <span>{e.name}</span>
            <span className="pick-meta"><span className="label">{prs[e.key] ? `PB ${fmtSet(prs[e.key].weight, prs[e.key].reps, prs[e.key].time)}` : t('ms.nSessions', { n: e.n })}</span></span>
          </button>
        ))}
        {!shown.length && <p className="empty">{t('pick.none')}</p>}
      </div>
    </Sheet>
  );
}
