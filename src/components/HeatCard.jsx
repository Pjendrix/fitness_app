import { useMemo, useState } from 'react';
import { heatInfo, HEAT_STATES } from '../lib/gamify.js';
import { t } from '../lib/i18n.js';
import { InfoIcon } from './Icons.jsx';

// Forge Heat: žhnutí místo tvrdé série. Trénink přitápí, každý den bez tréninku pomalu chladne.
export default function HeatCard({ workouts, goal }) {
  const [help, setHelp] = useState(false);
  // Přepočet jednou za otevření Home (čas se během prohlížení nemění natolik, aby to stálo za tik)
  const info = useMemo(() => heatInfo(workouts, goal), [workouts, goal]);
  const { heat, state, cool, grid } = info;
  const lower = HEAT_STATES[Math.max(0, HEAT_STATES.findIndex((s) => s.id === state) - 1)].id;
  const sub = !workouts.length ? t('heat.subEmpty')
    : state === 'cold' ? t('heat.subCold')
    : t('heat.subCool', { s: t('heat.' + lower), n: cool });

  return (
    <section className={'card heat is-' + state} aria-label={t('heat.title')}>
      <div className="heat-head">
        <span className="label">{t('heat.title')}</span>
        <button className="icon-btn heat-help" aria-expanded={help} aria-label={t('heat.how')} onClick={() => setHelp(!help)}><InfoIcon width={16} height={16} /></button>
      </div>
      <div className="heat-value">
        <strong>{t('heat.' + state)}</strong>
        <span className="mono heat-num">{heat}°</span>
      </div>
      <div className="heat-bar" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={heat} aria-label={t('heat.title')}>
        <i className="heat-fill" style={{ width: `${heat}%` }} />
        <i className="heat-knob" style={{ left: `${heat}%` }} />
      </div>
      <div className="heat-scale label" aria-hidden="true">{HEAT_STATES.map((s) => <span key={s.id}>{t('heat.' + s.id)}</span>)}</div>
      <div className="heat-grid" aria-label={t('heat.grid')}>
        {grid.map((d) => (
          <i key={d.date} className={d.on ? 'is-on' : ''} style={d.on ? { '--g': `${Math.round(35 + 65 * d.glow)}%` } : undefined}
            title={new Date(d.date).toLocaleDateString()} />
        ))}
      </div>
      <p className="muted small">{sub}</p>
      {help && <p className="small heat-explain">{t('heat.explain', { g: goal })}</p>}
    </section>
  );
}
