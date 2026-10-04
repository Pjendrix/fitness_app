import { useMemo, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { heatAt, heatState, monday } from '../lib/gamify.js';
import { activeBreak } from '../lib/breaks.js';
import { cardioWeek } from '../lib/cardio.js';
import { locale, t } from '../lib/i18n.js';
import { ArrowIcon, PlusIcon } from './Icons.jsx';
import { useRecapTeaser } from './MonthlyRecap.jsx';
import CardioSheet from './CardioSheet.jsx';

const DAY = 864e5;
const dayStart = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const dm = (ms) => new Date(ms).toLocaleDateString(locale(), { day: 'numeric', month: 'numeric' });

// Home: jedna karta týdne. Týden Po–Ne (kdy jsi trénoval), plnění cíle, poslední trénink, Heat (když je zapnutý),
// pauza / lehký týden a řádek kardia (minuty týdne vůči cíli WHO, rychlý záznam). Klepnutí na horní část → Stats.
export default function WeekCard({ onOpen }) {
  const { workouts, weeklyGoal, gamify, breaks, endPause, endDeload, activities, catOf, cardioGoal } = useStore();
  const recap = useRecapTeaser();
  const [cardio, setCardio] = useState(null); // null | 'list' | 'add'
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
    return { days, count, last, ago, mon };
  }, [workouts]);
  const heat = useMemo(() => (gamify ? heatAt(workouts, weeklyGoal, Date.now(), breaks) : 0), [gamify, workouts, weeklyGoal, breaks]);
  const cw = useMemo(() => cardioWeek(activities, workouts, (n) => catOf(n) === 'cardio', data.mon), [activities, workouts, catOf, data.mon]);
  const pause = activeBreak(breaks, 'pause');
  const deload = activeBreak(breaks, 'deload');
  const state = heatState(heat).id;
  const met = data.count >= weeklyGoal;
  const left = Math.max(0, weeklyGoal - data.count);
  const agoText = data.ago == null ? '' : data.ago === 0 ? t('week.today') : data.ago === 1 ? t('week.yesterday') : t('week.daysAgo', { n: data.ago });
  const cardioPct = cardioGoal ? Math.min(100, (cw.total / cardioGoal) * 100) : 0;

  return (
    <section className="card week-wrap">
      <button className="week-card" onClick={() => onOpen(gamify ? 'progress' : 'numbers')} aria-label={t('week.open')}>
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
          {pause ? t('week.pausedSub') : deload ? t('week.deloadSub') : met ? t('week.met') : t('week.left', { n: left })}
          {data.last && <span className="muted"> · {t('week.last', { name: data.last.name, when: agoText })}</span>}
        </p>
        {!gamify && <span className="week-heat"><span className="spacer" /><span className="label week-more">{t('week.stats')} <ArrowIcon width={12} height={12} style={{ transform: 'rotate(180deg)' }} /></span></span>}
        {gamify && (
          <span className="week-heat">
            <i className={'week-ember s-' + state + (pause ? ' is-paused' : '')} aria-hidden="true" />
            <span>{t('heat.' + state)} <span className="mono">{heat}°</span>{pause && <span className="muted"> · {t('week.heatPaused')}</span>}</span>
            {recap.show && <span className="week-new">{t('week.chapter', { m: recap.name })}</span>}
            <span className="spacer" />
            <ArrowIcon className="week-chev" width={14} height={14} style={{ transform: 'rotate(180deg)' }} aria-hidden="true" />
          </span>
        )}
      </button>

      {(pause || deload) && (
        <div className="week-row week-break">
          <span className="grow small">
            <b>{pause ? t('brk.pauseOn', { d: dm(pause.from) }) : t('brk.deloadOn', { d: dm(deload.to - 1) })}</b>
            <span className="muted"> · {pause ? t('brk.pauseSub') : t('brk.deloadSub')}</span>
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => (pause ? endPause() : endDeload())}>{t('brk.end')}</button>
        </div>
      )}

      <div className="week-row week-cardio">
        <button className="week-cardio-main" onClick={() => setCardio('list')} aria-label={t('cardio.open')}>
          <span className="week-cardio-top">
            <span className="label">{t('cardio.title')}</span>
            <span className="mono small">{cw.total}{cardioGoal ? <small> / {cardioGoal} min</small> : <small> min</small>}</span>
          </span>
          {cardioGoal > 0 && <i className="week-cardio-meter" aria-hidden="true"><i style={{ width: `${cardioPct}%` }} /></i>}
        </button>
        <button className="icon-btn week-cardio-add" aria-label={t('cardio.add')} onClick={() => setCardio('add')}><PlusIcon width={18} height={18} /></button>
      </div>

      {cardio && <CardioSheet start={cardio} week={cw} mon={data.mon} onClose={() => setCardio(null)} />}
    </section>
  );
}
