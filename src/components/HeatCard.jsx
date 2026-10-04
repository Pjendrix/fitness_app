import { useMemo, useState } from 'react';
import { heatInfo, heatState } from '../lib/gamify.js';
import { activeBreak } from '../lib/breaks.js';
import { locale, t } from '../lib/i18n.js';
import { InfoIcon } from './Icons.jsx';

// Forge Heat: žhnutí místo tvrdé série. Ember bars = jeden sloupek na den za 4 týdny,
// výška = Heat ten večer, plný sloupek = trénink, vybledlý = den volna (chladne), dnešek orámovaný.
export default function HeatCard({ workouts, goal, breaks = [] }) {
  const [help, setHelp] = useState(false);
  const info = useMemo(() => heatInfo(workouts, goal, Date.now(), 28, breaks), [workouts, goal, breaks]);
  const { heat, state, bars } = info;
  const paused = Boolean(activeBreak(breaks, 'pause'));
  // Žádný odpočet „za N dní klesne“ – volno k tréninku patří, Heat hlídá pravidelnost vůči vlastnímu cíli
  const sub = !workouts.length ? t('heat.subEmpty')
    : paused ? t('heat.subPaused')
    : state === 'cold' ? t('heat.subCold')
    : state === 'hot' ? t('heat.subHot', { g: goal })
    : t('heat.subRest');
  const fmt = (ms) => new Date(ms).toLocaleDateString(locale(), { day: 'numeric', month: 'numeric' });
  const trainedN = bars.filter((b) => b.on).length;

  return (
    <section className={'card heat is-' + state} aria-label={t('heat.title')}>
      <div className="heat-head">
        <span className="label">{t('heat.title')}</span>
        <span className="heat-head-end">
          <span className="label">{t('heat.weeks')}</span>
          <button className="icon-btn heat-help" aria-expanded={help} aria-label={t('heat.how')} onClick={() => setHelp(!help)}><InfoIcon width={16} height={16} /></button>
        </span>
      </div>
      <div className="heat-value">
        <strong>{t('heat.' + state)}</strong>
        <span className="mono heat-num">{heat}°</span>
      </div>

      <figure className="heat-chart" aria-label={t('heat.bars', { h: heat, n: trainedN })}>
        <div className="heat-bars" aria-hidden="true">
          {bars.map((b, i) => (
            <i key={b.date} className={'s-' + heatState(b.h).id + (b.on ? ' is-on' : '') + (i === bars.length - 1 ? ' is-today' : '')}
              style={{ height: `${Math.max(6, b.h)}%` }} title={`${fmt(b.date)} · ${b.h}°`} />
          ))}
        </div>
        <div className="heat-ticks label" aria-hidden="true">
          <span>{fmt(bars[0].date)}</span><span>{fmt(bars[14].date)}</span><span className="is-today">{t('heat.today')}</span>
        </div>
        <figcaption className="heat-legend small">
          <span><i className="s-glow is-on" aria-hidden="true" />{t('heat.lgWorkout')}</span>
          <span><i className="s-glow" aria-hidden="true" />{t('heat.lgCooling')}</span>
        </figcaption>
      </figure>

      <p className="muted small">{sub}</p>
      {help && <p className="small heat-explain">{t('heat.explain', { g: goal })}</p>}
    </section>
  );
}
