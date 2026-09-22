import { useMemo, useState } from 'react';
import { t } from '../lib/i18n.js';

const DAY = 864e5, WEEK = 7 * DAY, WEEKS = 12, MAX_GOAL = 7;
const monday = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };
const dm = (ms) => { const d = new Date(ms); return `${d.getDate()}. ${d.getMonth() + 1}.`; };

// Týdenní cíl: plnění tento týden, série splněných týdnů, 12 týdnů ve sloupcích a rozložení splitu.
export default function WeeklyGoal({ workouts, goal, setGoal, groups }) {
  const [sel, setSel] = useState(WEEKS - 1);

  const weeks = useMemo(() => {
    const cur = monday(Date.now());
    const counts = Array(WEEKS).fill(0);
    for (const w of workouts) {
      const i = WEEKS - 1 - Math.round((cur - monday(w.startedAt)) / WEEK);
      if (i >= 0 && i < WEEKS) counts[i]++;
    }
    return counts.map((n, i) => ({ n, start: cur - (WEEKS - 1 - i) * WEEK }));
  }, [workouts]);

  // Série: splněné týdny v řadě; aktuální týden se počítá, jen když už je splněný
  const streak = useMemo(() => {
    const cur = monday(Date.now());
    const byWeek = new Map();
    for (const w of workouts) { const m = monday(w.startedAt); byWeek.set(m, (byWeek.get(m) || 0) + 1); }
    let s = (byWeek.get(cur) || 0) >= goal ? 1 : 0;
    for (let m = monday(cur - DAY); (byWeek.get(m) || 0) >= goal; m = monday(m - DAY)) s++;
    return s;
  }, [workouts, goal]);

  const split = useMemo(() => {
    const from = Date.now() - 30 * DAY;
    const ids = groups.map((g) => g.id);
    const count = Object.fromEntries(ids.map((id) => [id, 0]));
    const last = {};
    for (const w of workouts) {
      if (!ids.includes(w.group)) continue;
      if (w.startedAt >= from) count[w.group]++;
      last[w.group] = Math.max(last[w.group] || 0, w.startedAt);
    }
    const total = Object.values(count).reduce((a, b) => a + b, 0);
    // Zaostávající skupina: nejdéle necvičená, pokud je to víc než 7 dní
    let lag = null;
    for (const g of groups) {
      const days = last[g.id] ? Math.floor((Date.now() - last[g.id]) / DAY) : null;
      if (days === null || days >= 7) if (!lag || (lag.days !== null && (days === null || days > lag.days))) lag = { label: g.label, days };
    }
    return { rows: groups.map((g) => ({ label: g.label, n: count[g.id] })), total, lag: total ? lag : null };
  }, [workouts, groups]);

  const thisWeek = weeks[WEEKS - 1].n;
  const top = Math.max(goal + 1, ...weeks.map((w) => w.n));
  const s = weeks[sel];
  const shades = ['var(--ink)', 'color-mix(in srgb, var(--ink) 55%, transparent)', 'color-mix(in srgb, var(--ink) 22%, transparent)', 'color-mix(in srgb, var(--ink) 10%, transparent)'];

  return (
    <section className="card wg">
      <div className="card-head">
        <h2>{t('wg.title')}</h2>
        <div className="wg-goal" role="group" aria-label={t('wg.goalAria')}>
          <button aria-label={t('wg.less')} disabled={goal <= 1} onClick={() => setGoal(goal - 1)}>−</button>
          <span className="label">{t('wg.goal', { n: goal })}</span>
          <button aria-label={t('wg.more')} disabled={goal >= MAX_GOAL} onClick={() => setGoal(goal + 1)}>+</button>
        </div>
      </div>

      <div className="wg-kpis">
        <div className="wg-kpi">
          <span className="muted small">{t('wg.thisWeek')}</span>
          <strong>{thisWeek}<small> / {goal}</small></strong>
          <i className="wg-meter"><i style={{ width: `${Math.min(100, (thisWeek / goal) * 100)}%` }} /></i>
        </div>
        <div className="wg-kpi">
          <span className="muted small">{t('wg.streak')}</span>
          <strong>{streak}<small> {t('wg.weeks', { n: streak })}</small></strong>
          <span className="muted small">{t('wg.streakSub')}</span>
        </div>
      </div>

      <div className="wg-bars" role="list">
        <i className="wg-line" style={{ bottom: `calc(${(goal / top) * 100}% * 0.82 + 18px)` }} aria-hidden="true" />
        {weeks.map((w, i) => {
          const cls = i === WEEKS - 1 ? 'cur' : w.n >= goal ? 'met' : '';
          const d = new Date(w.start);
          return (
            <button key={w.start} role="listitem" className={`wg-bar ${cls}${i === sel ? ' sel' : ''}`} onClick={() => setSel(i)}
              aria-label={t('wg.weekAria', { d: dm(w.start), n: w.n })}>
              <i style={{ height: `calc(${(w.n / top) * 100}% * 0.82)` }} />
              <span>{i === 0 || d.getDate() <= 7 ? `${d.getDate()}.${d.getMonth() + 1}.` : ''}</span>
            </button>
          );
        })}
      </div>
      <p className="muted small wg-detail">
        {dm(s.start)} – {dm(s.start + 6 * DAY)} · {t('count.workouts', { n: s.n })} · {sel === WEEKS - 1 ? t('wg.running') : s.n >= goal ? t('wg.met') : t('wg.missed')}
      </p>

      {split.total > 0 && (
        <div className="wg-split">
          <div className="row-between"><span className="wg-split-title">{t('wg.split')}</span><span className="muted small">{t('wg.last30')}</span></div>
          <div className="wg-split-bar">
            {split.rows.map((r, i) => r.n > 0 && <i key={r.label} style={{ flex: r.n, background: shades[i % shades.length] }} />)}
          </div>
          <div className="wg-split-legend">{split.rows.map((r) => <span key={r.label}>{r.label} {r.n}</span>)}</div>
          {split.lag && <p className="wg-lag">{split.lag.days === null ? t('wg.lagNever', { g: split.lag.label }) : t('wg.lag', { g: split.lag.label, n: split.lag.days })}</p>}
        </div>
      )}
    </section>
  );
}
