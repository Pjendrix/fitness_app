import { useMemo, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { categoryOf, CATEGORIES } from '../data/exercises.js';
import { BarChart, HBars, Heatmap, LineChart } from '../components/Charts.jsx';
import { fmtDate, fmtDuration, fmtNum, fmtSet, workoutVolume } from '../lib/util.js';

const WEEK = 7 * 864e5;
const RANGES = [{ id: 4, label: '4 t' }, { id: 12, label: '12 t' }, { id: 26, label: '6 m' }, { id: 52, label: '1 r' }];
const e1rm = (w, r) => (r <= 1 ? w : w * (1 + r / 30)); // Epley
const GROUP_FALLBACK = { PUSH: 'Prsa', PULL: 'Záda', LEGS: 'Nohy' };

const monday = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };

export default function Analytics() {
  const { workouts, prs } = useStore();
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
    const lab = (t) => new Date(t).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });
    return {
      vol: buckets.map((b) => ({ label: lab(b.t), title: `Týden od ${lab(b.t)}`, value: Math.round(b.vol) })),
      n: buckets.map((b) => ({ label: lab(b.t), title: `Týden od ${lab(b.t)}`, value: b.n })),
    };
  }, [inRange, range]);

  const muscles = useMemo(() => {
    const m = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
    for (const w of inRange) for (const e of w.exercises) {
      const c = categoryOf(e.name) || GROUP_FALLBACK[w.group] || 'Ostatní';
      m[c] = (m[c] || 0) + e.sets.length;
    }
    return Object.entries(m).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [inRange]);

  const heat = useMemo(() => {
    const d = {};
    for (const w of workouts) { const k = new Date(w.startedAt).toDateString(); d[k] = (d[k] || 0) + 1; }
    return d;
  }, [workouts]);

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
      const top = e.sets.reduce((a, s) => (s.weight > a.weight || (s.weight === a.weight && s.reps > a.reps) ? s : a), e.sets[0]);
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
        <header className="screen-head"><h1>Statistiky</h1></header>
        <p className="empty">Grafy se objeví po prvních dokončených trénincích.</p>
      </div>
    );
  }

  const bodyweight = progress?.every((s) => s.top.weight === 0);

  return (
    <div className="screen screen-wide">
      <header className="screen-head row-between">
        <h1>Statistiky</h1>
        <div className="seg seg-sm seg-inline" role="tablist" aria-label="Období">
          {RANGES.map((r) => <button key={r.id} role="tab" aria-selected={range === r.id} className={range === r.id ? 'is-on' : ''} onClick={() => setRange(r.id)}>{r.label}</button>)}
        </div>
      </header>

      <section className="kpis">
        <div className="card kpi"><span className="label">Tréninky</span><span className="num">{kpi.count}</span><span className="muted small">{fmtNum(Math.round(kpi.perWeek * 10) / 10)} týdně</span></div>
        <div className="card kpi"><span className="label">Objem</span><span className="num">{fmtNum(Math.round(kpi.vol / 100) / 10)}<small> t</small></span><span className="muted small">váha × opakování</span></div>
        <div className="card kpi"><span className="label">Série</span><span className="num">{kpi.sets}</span><span className="muted small">odškrtnutých</span></div>
        <div className="card kpi"><span className="label">Průměrná délka</span><span className="num">{fmtDuration(kpi.dur)}</span><span className="muted small">na trénink</span></div>
      </section>

      <div className="an-grid">
        <section className="card span-2">
          <div className="card-head"><h2>Progres cvičení</h2>
            <select className="input input-sm" value={sel || ''} onChange={(e) => setExSel(e.target.value)} aria-label="Cvičení">
              {exList.map((e) => <option key={e.key} value={e.key}>{e.name} ({e.n})</option>)}
            </select>
          </div>
          {progress && (
            <>
              <LineChart
                unit={bodyweight ? '' : ' kg'}
                series={bodyweight
                  ? [{ name: 'Max opakování', points: progress.map((s) => ({ x: s.t, y: s.top.reps })) }]
                  : [
                      { name: 'Odhad 1RM', points: progress.map((s) => ({ x: s.t, y: s.e1 })) },
                      { name: 'Top váha', points: progress.map((s) => ({ x: s.t, y: s.top.weight })) },
                    ]}
              />
              <div className="mini-stats">
                <div><span className="label">PB</span><span>{prs[sel] ? fmtSet(prs[sel].weight, prs[sel].reps) : '–'}</span></div>
                <div><span className="label">Odhad 1RM</span><span>{bodyweight ? '–' : `${fmtNum(Math.round(Math.max(...progress.map((s) => s.e1))))} kg`}</span></div>
                <div><span className="label">Tréninků</span><span>{progress.length}</span></div>
                <div><span className="label">Změna top váhy</span><span>{progress.length > 1 && !bodyweight ? `${progress.at(-1).top.weight - progress[0].top.weight >= 0 ? '+' : ''}${fmtNum(progress.at(-1).top.weight - progress[0].top.weight)} kg` : '–'}</span></div>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Datum</th><th>Série</th><th className="r">Objem</th></tr></thead>
                  <tbody>
                    {[...progress].reverse().slice(0, 8).map((s) => (
                      <tr key={s.t}><td>{fmtDate(s.t)}</td><td className="mono">{s.sets.map((x) => fmtSet(x.weight, x.reps)).join(', ')}</td><td className="r mono">{fmtNum(Math.round(s.vol))}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <section className="card"><div className="card-head"><h2>Objem po týdnech</h2><span className="label">kg</span></div><BarChart data={weekly.vol} unit=" kg" format={(v) => (v >= 1000 ? fmtNum(Math.round(v / 100) / 10) + 'k' : fmtNum(Math.round(v)))} /></section>
        <section className="card"><div className="card-head"><h2>Tréninky po týdnech</h2></div><BarChart data={weekly.n} format={(v) => fmtNum(Math.round(v * 10) / 10)} /></section>
        <section className="card"><div className="card-head"><h2>Série podle partie</h2></div><HBars data={muscles} /></section>
        <section className="card"><div className="card-head"><h2>Docházka</h2><span className="label">18 týdnů</span></div><Heatmap days={heat} /></section>

        <section className="card span-2">
          <div className="card-head"><h2>Osobní rekordy</h2><span className="label">{Object.keys(prs).length}</span></div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Cvičení</th><th className="r">Rekord</th><th className="r">Odhad 1RM</th><th className="r">Datum</th></tr></thead>
              <tbody>
                {Object.entries(prs).sort((a, b) => b[1].weight - a[1].weight).map(([k, p]) => (
                  <tr key={k} onClick={() => setExSel(k)} className="clickable">
                    <td>{p.name}</td><td className="r mono">{fmtSet(p.weight, p.reps)}</td>
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
