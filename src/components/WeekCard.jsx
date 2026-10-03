import { useMemo } from 'react';
import { useStore } from '../lib/store.jsx';
import { heatAt, heatState, monday } from '../lib/gamify.js';
import { locale, t } from '../lib/i18n.js';
import { ArrowIcon } from './Icons.jsx';
import { useRecapTeaser } from './MonthlyRecap.jsx';

const DAY = 864e5;
const dayStart = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };

// Home: jedna karta místo dlaždic. Týden Po–Ne (kdy jsi trénoval), plnění cíle, poslední trénink
// a – když je Forge Heat zapnutý – jeden řádek s Heatem. Klepnutí → Stats (Progress / Numbers).
export default function WeekCard({ onOpen }) {
  const { workouts, weeklyGoal, gamify } = useStore();
  const recap = useRecapTeaser();
  const data = useMemo(() => {
    const now = Date.now();
    const mon = monday(now), today = dayStart(now);
    const trained = new Set(workouts.map((w) => dayStart(w.startedAt)));
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon); d.setDate(d.getDate() + i);
      const ms = d.getTime();
      return { ms, on: trained.has(ms), today: ms === today, future: ms > today, letter: d.toLocaleDateString(locale(), { weekday: 'narrow' }) };
    });
    const count = workouts.filter((w) => w.startedAt >= mon).length;
    const last = workouts.reduce((a, w) => (!a || w.startedAt > a.startedAt ? w : a), null);
    const ago = last ? Math.round((today - dayStart(last.startedAt)) / DAY) : null;
    return { days, count, last, ago };
  }, [workouts]);
  const heat = useMemo(() => (gamify ? heatAt(workouts, weeklyGoal) : 0), [gamify, workouts, weeklyGoal]);
  const state = heatState(heat).id;
  const met = data.count >= weeklyGoal;
  const left = Math.max(0, weeklyGoal - data.count);
  const agoText = data.ago == null ? '' : data.ago === 0 ? t('week.today') : data.ago === 1 ? t('week.yesterday') : t('week.daysAgo', { n: data.ago });

  return (
    <button className="card week-card" onClick={() => onOpen(gamify ? 'progress' : 'numbers')} aria-label={t('week.open')}>
      <div className="week-top">
        <span className="label">{t('week.title')}</span>
        <span className={'mono week-count' + (met ? ' is-met' : '')}>{data.count}<small> / {weeklyGoal}</small></span>
      </div>
      <div className="week-days" aria-hidden="true">
        {data.days.map((d) => (
          <span key={d.ms} className={'week-day' + (d.on ? ' is-on' : '') + (d.today ? ' is-today' : '') + (d.future ? ' is-future' : '')}>
            <i />{d.letter}
          </span>
        ))}
      </div>
      <p className="small week-sub">
        {met ? t('week.met') : t('week.left', { n: left })}
        {data.last && <span className="muted"> · {t('week.last', { name: data.last.name, when: agoText })}</span>}
      </p>
      {!gamify && <span className="week-heat"><span className="spacer" /><span className="label week-more">{t('week.stats')} <ArrowIcon width={12} height={12} style={{ transform: 'rotate(180deg)' }} /></span></span>}
      {gamify && (
        <span className="week-heat">
          <i className={'week-ember s-' + state} aria-hidden="true" />
          <span>{t('heat.' + state)} <span className="mono">{heat}°</span></span>
          {recap.show && <span className="week-new">{t('week.chapter', { m: recap.name })}</span>}
          <span className="spacer" />
          <ArrowIcon className="week-chev" width={14} height={14} style={{ transform: 'rotate(180deg)' }} aria-hidden="true" />
        </span>
      )}
    </button>
  );
}
