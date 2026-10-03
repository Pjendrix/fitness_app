import { useMemo } from 'react';
import Sheet from './Sheet.jsx';
import { useStore } from '../lib/store.jsx';
import { ROMAN, SCALES, tierDates, TIERS } from '../lib/gamify.js';
import { locale, t } from '../lib/i18n.js';
import { fmtDate, fmtNum } from '../lib/util.js';

const r1 = (v) => fmtNum(Math.round(v * 10) / 10);
const r2 = (v) => (Math.round(v * 100) / 100).toLocaleString(locale());
const day = (ms) => new Date(ms).toLocaleDateString(locale(), { day: 'numeric', month: 'short' });
const kgRound = (v) => Math.round(v / 2.5) * 2.5;
// Jednotka každého milníku (cíle v žebříčku i hodnota „tvůj nejlepší“)
const UNIT = {
  workouts: 'workouts', tonnage: 't', streak: 'weeks', perfect: 'months', balanced: 'months', explorer: 'exercises', anniversary: 'years',
  steady: 'days', forged: 'days', pullups: 'reps', levelup: 'weights', growth: 'pct', prs: 'records', hot: 'records',
};
const STRENGTH = new Set(['bench', 'squat', 'deadlift', 'ohp', 'total']);
const fmtUnit = (id, v) => {
  const u = UNIT[id];
  if (u === 't') return `${r1(v)} t`;
  if (u === 'pct') return `+${Math.round(v)} %`;
  return t('mile.u.' + u, { n: Math.round(v * 10) / 10 });
};

// Detail milníku: co přesně se počítá, tvůj nejlepší výkon, další úroveň a žebříček I–V s daty získání
export default function MilestoneSheet({ m, onClose, onScale }) {
  const { workouts, weeklyGoal, main, body, strengthScale } = useStore();
  const groups = useMemo(() => main.groups.map((g) => g.id), [main]);
  const dates = useMemo(() => tierDates(workouts, m.id, { goal: weeklyGoal, groups, body, scale: strengthScale }), [workouts, m.id, weeklyGoal, groups, body, strengthScale]);
  const strength = STRENGTH.has(m.id);
  const tiers = (strength || m.id === 'pullups' ? (SCALES[strengthScale] || SCALES.standard)[m.id] : TIERS[m.id]) || [];
  const bw = m.bwNow;
  const target = (x) => (strength ? `${r2(x)}×${bw ? ` · ≈ ${fmtNum(kgRound(x * bw))} kg` : ''}` : fmtUnit(m.id, x));

  // „Tvůj nejlepší“
  let bestVal = null, bestSub = null;
  if (strength && m.id !== 'total') {
    if (m.best) {
      bestVal = m.best.bw ? `${r2(m.value)}×` : `${fmtNum(m.best.kg)} kg`;
      bestSub = `${fmtNum(m.best.kg)} kg × ${m.best.reps} · ${day(m.best.date)}${m.best.bw ? ' · ' + t('mile.d.atBw', { bw: r1(m.best.bw) }) : ''}`;
    }
  } else if (m.id === 'total') {
    if (!m.missing) {
      bestVal = bw ? `${r2(m.value)}×` : `${fmtNum(m.kg)} kg`;
      bestSub = `${fmtNum(m.lifts.bench)} + ${fmtNum(m.lifts.squat)} + ${fmtNum(m.lifts.deadlift)} = ${fmtNum(m.kg)} kg`;
    }
  } else if (m.id === 'pullups') {
    if (m.best) { bestVal = fmtUnit('pullups', m.value); bestSub = day(m.best.date); }
  } else if (m.id === 'steady') {
    bestVal = fmtUnit('steady', m.value); bestSub = t('mile.d.current', { n: m.current ?? 0 });
  } else if (m.id === 'growth') {
    if (m.lift) { bestVal = fmtUnit('growth', m.value); bestSub = `${m.lift}: ${r1(m.from)} → ${r1(m.to)} kg e1RM`; }
  } else if (m.id === 'hot') {
    if (m.best) { bestVal = fmtUnit('hot', m.value); bestSub = `${m.best.name} · ${day(m.best.date)}`; }
  } else if (m.id === 'anniversary') {
    if (m.first) { bestVal = fmtUnit('anniversary', m.value); bestSub = t('mile.d.since', { d: fmtDate(m.first) }); }
  } else if (UNIT[m.id]) {
    bestVal = fmtUnit(m.id, m.value);
  }
  const single = m.max === 1;

  return (
    <Sheet label={t('mile.' + m.id)} onClose={onClose} className="sheet-mile">
      <div className="mile-sheet-head">
        <span className={'mile-disc mono' + (m.tier ? ' is-earned' : '')} aria-hidden="true">{ROMAN[m.tier]}</span>
        <div className="grow">
          <span className="label">{t('mile.g.' + m.group)}</span>
          <h2>{t('mile.' + m.id)}</h2>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>{t('pick.close')}</button>
      </div>
      <div className="mile-sheet-body">
        <section className="mile-sec">
          <span className="label">{t('mile.d.what')}</span>
          <p>{t('mile.w.' + m.id, { lift: m.lift || t('mile.' + m.id) })}</p>
        </section>

        {!single && (bestVal || m.next != null) && (
          <div className="mile-boxes">
            <div className="mile-box"><span className="label">{t(m.id === 'steady' ? 'mile.d.bestRun' : 'mile.d.best')}</span><strong className="mono">{bestVal ?? '—'}</strong>{bestSub && <span className="small muted">{bestSub}</span>}</div>
            {m.next != null
              ? <div className="mile-box is-next"><span className="label">{t('mile.d.next', { r: ROMAN[m.tier + 1] })}</span><strong className="mono">{strength ? `${r2(m.next)}×` : target(m.next)}</strong><span className="small">{m.nobody && strength ? t('mile.n.nobody') : [strength && bw ? `≈ ${fmtNum(kgRound(m.next * bw))} kg` : null, nextLeft(m)].filter(Boolean).join(' · ')}</span></div>
              : <div className="mile-box is-next"><span className="label">{t('mile.maxed')}</span><strong className="mono">V</strong></div>}
          </div>
        )}

        {single ? (
          <p className={'mile-single' + (m.tier ? ' is-earned' : '')}>{m.tier ? `✓ ${dates[0] ? t('mile.d.earnedOn', { d: day(dates[0]) }) : t('mile.earned')}` : t('mile.d.notYet')}</p>
        ) : (
          <section className="mile-sec">
            <span className="label">{strength || m.id === 'pullups' ? t('mile.d.tiersScale', { s: t('scale.' + strengthScale) }) : t('mile.d.tiers')}</span>
            <ol className="mile-ladder">
              {tiers.map((x, i) => {
                const done = i < m.tier, isNext = i === m.tier;
                return (
                  <li key={x} className={done ? 'is-done' : isNext ? 'is-next' : ''}>
                    <span className="mile-ladder-disc mono">{ROMAN[i + 1]}</span>
                    <span className="grow">{target(x)}</span>
                    <span className="mono small mile-ladder-meta">{done ? `✓ ${dates[i] ? day(dates[i]) : ''}` : isNext ? nextLeft(m) : ''}</span>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {strength && (
          <p className="small muted">{bw ? t('mile.d.bwNote', { bw: r1(bw) }) : t('mile.n.nobody')} <button className="link" onClick={onScale}>{t('mile.d.scaleLink')}</button></p>
        )}
      </div>
    </Sheet>
  );
}

// Krátký text „kolik zbývá“ k další úrovni
function nextLeft(m) {
  if (m.next == null) return '';
  if (STRENGTH.has(m.id)) return m.needKg != null ? t('mile.d.kgLeft', { kg: fmtNum(m.needKg) }) : '';
  const left = m.next - m.value;
  if (m.id === 'tonnage') return t('mile.d.left', { v: `${r1(left)} t` });
  if (m.id === 'growth') return t('mile.d.left', { v: `${Math.ceil(left)} %` });
  if (m.id === 'anniversary') return m.nextDate ? day(m.nextDate) : '';
  return t('mile.d.left', { v: fmtNum(Math.ceil(left)) });
}

// Obecné vysvětlení milníků
export function MilestonesHelp({ onClose }) {
  return (
    <Sheet label={t('mile.h.title')} onClose={onClose} className="sheet-mile">
      <div className="mile-sheet-head"><span className="mile-disc mono is-earned" aria-hidden="true">?</span><div className="grow"><h2>{t('mile.h.title')}</h2></div><button className="btn btn-ghost btn-sm" onClick={onClose}>{t('pick.close')}</button></div>
      <div className="mile-sheet-body">
        {['tiers', 'history', 'strength', 'heat', 'secret'].map((k) => (
          <section key={k} className="mile-sec"><span className="label">{t('mile.h.' + k)}</span><p>{t('mile.h.' + k + 'Text')}</p></section>
        ))}
      </div>
    </Sheet>
  );
}
