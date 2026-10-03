import { useMemo, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { addMonths, closestMilestone, milestoneMax, milestones, milestoneTiers, MILESTONE_GROUPS, monthStart, ROMAN } from '../lib/gamify.js';
import { locale, t } from '../lib/i18n.js';
import { fmtDate, fmtNum } from '../lib/util.js';
import MonthlyRecap from './MonthlyRecap.jsx';
import { ArrowIcon } from './Icons.jsx';

const r1 = (v) => fmtNum(Math.round(v * 10) / 10);
const r2 = (v) => (Math.round(v * 100) / 100).toLocaleString(locale()); // 1,25× – dvě desetinná místa, desetinná čárka v češtině

// Text pod kartou: další úroveň a kolik zbývá
export function nextText(m) {
  if (m.next == null) return m.max === 1 ? t('mile.d.' + m.id) : t('mile.maxed');
  const r = ROMAN[m.tier + 1];
  switch (m.id) {
    case 'workouts': return t('mile.n.workouts', { r, next: m.next, v: m.value });
    case 'tonnage': return t('mile.n.tonnage', { r, next: fmtNum(m.next), v: r1(m.value) });
    case 'streak': return t('mile.n.streak', { r, next: m.next, v: m.value, n: m.next });
    case 'perfect': case 'balanced': return t('mile.n.months', { r, next: m.next, v: m.value, n: m.next });
    case 'explorer': return t('mile.n.explorer', { r, next: m.next, v: m.value });
    case 'steady': return t('mile.n.steady', { r, next: m.next, v: m.value });
    case 'forged': return t('mile.n.forged', { r, next: m.next, v: m.value });
    case 'rekindled': return t('mile.n.rekindled');
    case 'anniversary': return m.nextDate ? t('mile.n.anniversary', { r, d: fmtDate(m.nextDate) }) : t('mile.n.anniversaryNone');
    case 'bench': case 'squat': case 'deadlift': case 'ohp':
      if (m.nobody) return t('mile.n.nobody');
      if (!m.kg) return t('mile.n.bwNone', { r, next: r2(m.next) });
      return t('mile.n.bw', { r, next: r2(m.next), kg: r1(m.needKg ?? 0) });
    case 'total':
      if (m.nobody) return t('mile.n.nobody');
      if (m.missing) return t('mile.n.totalMissing', { r, next: r2(m.next) });
      return t('mile.n.total', { r, next: r2(m.next), v: r1(m.kg), kg: r1(m.needKg ?? 0) });
    case 'levelup': return t('mile.n.levelup', { r, next: m.next, v: m.value });
    case 'growth': return m.lift ? t('mile.n.growth', { r, next: m.next, v: Math.round(m.value), ex: m.lift }) : t('mile.n.growthNone', { r, next: m.next });
    case 'pullups': return t('mile.n.pullups', { r, next: m.next, v: m.value });
    case 'prs': return t('mile.n.prs', { r, next: m.next, v: m.value });
    case 'hot': return t('mile.n.hot', { r, next: m.next, v: m.value });
    default: return '';
  }
}

function Row({ m }) {
  const cls = 'mile-row' + (m.tier ? ' is-earned' : '') + (m.next == null && m.max > 1 ? ' is-max' : '');
  return (
    <div className={cls}>
      <span className="mile-disc mono" aria-hidden="true">{ROMAN[m.tier]}</span>
      <div className="mile-body">
        <div className="mile-top">
          <span className="mile-name">{t('mile.' + m.id)}</span>
          <span className="mile-pips" role="img" aria-label={t('mile.tierAria', { n: m.tier, max: m.max })}>
            {Array.from({ length: m.max }, (_, i) => <i key={i} className={i < m.tier ? 'is-on' : ''} />)}
          </span>
        </div>
        <i className={'mile-bar' + (m.pct >= 0.85 && m.next != null ? ' is-near' : '')}><i style={{ width: `${Math.round(m.pct * 100)}%` }} /></i>
        <span className="mono mile-next">{nextText(m)}</span>
      </div>
    </div>
  );
}

// Milestones: karty s úrovněmi I–V, nahoře nejbližší další úroveň, dole měsíční kapitoly
// part: 'all' (mobil) | 'side' (souhrn + kapitoly) | 'list' (skupiny karet) – desktop je skládá do dvou sloupců
export default function Milestones({ go, part = 'all' }) {
  const { workouts, weeklyGoal, main, body, strengthScale } = useStore();
  const groups = useMemo(() => main.groups.map((g) => g.id), [main]);
  const list = useMemo(() => milestones(workouts, { goal: weeklyGoal, groups, body, scale: strengthScale }), [workouts, weeklyGoal, groups, body, strengthScale]);
  const closest = closestMilestone(list);
  const earned = milestoneTiers(list);
  const hidden = list.filter((m) => m.secret && !m.tier).length; // tajné: vidět až po získání
  const [recap, setRecap] = useState(null);
  // Měsíční kapitoly: posledních 6 dokončených měsíců s aspoň jedním tréninkem
  const months = useMemo(() => {
    const out = [];
    const cur = monthStart(Date.now());
    for (let i = 1; i <= 6; i++) {
      const m = addMonths(cur, -i), end = addMonths(m, 1);
      const n = workouts.filter((w) => w.startedAt >= m && w.startedAt < end).length;
      if (n) out.push({ m, n });
    }
    return out;
  }, [workouts]);

  if (!workouts.length) return part === 'list' ? null : <p className="empty">{t('mile.empty')}</p>;

  const summary = (
    <>
      <div className="mile-head"><h2>{t('hist.sec.milestones')}</h2><span className="label">{t('mile.count', { n: earned, max: milestoneMax(list) })}</span></div>
      {closest && (
        <section className="card card-hero mile-closest">
          <span className="label mile-eyebrow">{t('mile.closest')}</span>
          <div className="row-between"><span className="big-ish">{t('mile.' + closest.id)} · {ROMAN[closest.tier + 1]}</span><span className="mono small">{Math.round(closest.pct * 100)} %</span></div>
          <i className="mile-bar is-near"><i style={{ width: `${Math.round(closest.pct * 100)}%` }} /></i>
          <span className="small mile-closest-sub">{nextText(closest)}</span>
        </section>
      )}
    </>
  );
  const groupsView = MILESTONE_GROUPS.map(([g, ids]) => {
    const rows = list.filter((m) => ids.includes(m.id) && (!m.secret || m.tier));
    if (g === 'secret') return (
      <section key={g} className="mile-group">
        <h3 className="label mile-group-title">{t('mile.g.secret')}</h3>
        {rows.length > 0 && <div className="card mile-list">{rows.map((m) => <Row key={m.id} m={m} />)}</div>}
        {hidden > 0 && <p className="muted small mile-note mile-hidden">{t('mile.hidden', { n: hidden })}</p>}
      </section>
    );
    if (!rows.length) return null;
    return (
      <section key={g} className="mile-group">
        <h3 className="label mile-group-title">{t('mile.g.' + g)}</h3>
        <div className="card mile-list">{rows.map((m) => <Row key={m.id} m={m} />)}</div>
        {g === 'strength' && (
          <p className="muted small mile-note">{t('mile.scaleNote', { s: t('scale.' + strengthScale) })} <button className="link" onClick={() => go('settings')}>{t('mile.scaleChange')}</button></p>
        )}
      </section>
    );
  });
  const chapters = months.length > 0 && (
    <section className="mile-group">
      <h3 className="label mile-group-title">{t('recap.chapters')}</h3>
      <div className="card list">
        {months.map(({ m, n }) => (
          <button key={m} className="row row-link recap-link" onClick={() => setRecap(m)}>
            <span>{new Date(m).toLocaleDateString(locale(), { month: 'long', year: 'numeric' })}</span>
            <span className="muted small">{t('count.workouts', { n })} <ArrowIcon width={12} height={12} style={{ transform: 'rotate(180deg)' }} /></span>
          </button>
        ))}
      </div>
    </section>
  );

  return (
    <>
      {part !== 'list' && summary}
      {part !== 'side' && groupsView}
      {part !== 'list' && chapters}
      {recap && <MonthlyRecap month={recap} onClose={() => setRecap(null)} />}
    </>
  );
}
