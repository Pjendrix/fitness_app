import { useMemo, useState } from 'react';
import { fmtNum } from '../lib/util.js';
import { t } from '../lib/i18n.js';

const MAX_BARS = 24;
const METRICS = [
  { k: 'score', f: (v) => fmtNum(Math.round(v)), u: '' },
  { k: 'sets', f: (v) => fmtNum(Math.round(v)), u: '' },
  { k: 'exercises', f: (v) => fmtNum(Math.round(v * 10) / 10), u: '' },
  { k: 'volume', f: (v) => fmtNum(Math.round(v / 100) / 10), u: ' t' },
  { k: 'minutes', f: (v) => fmtNum(Math.round(v)), u: ' min' },
  { k: 'density', f: (v) => fmtNum(Math.round(v)), u: ' kg/min' },
  { k: 'intensity', f: (v) => fmtNum(Math.round(v)), u: ' %' },
];
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const dm = (ms) => { const d = new Date(ms); return `${d.getDate()}. ${d.getMonth() + 1}.`; };

// Náročnost tréninků: jedna karta, přepínač metrik, sloupec = trénink.
export default function WorkoutLoad({ metrics }) {
  const [key, setKey] = useState('score');
  const list = useMemo(() => metrics.slice(-MAX_BARS), [metrics]);
  const [sel, setSel] = useState(null);
  const m = METRICS.find((x) => x.k === key);
  const vals = list.map((w) => w[key]);
  const valid = vals.filter((v) => v != null);
  const a = avg(valid);
  const last4 = avg(valid.slice(-4)), prev4 = valid.length >= 8 ? avg(valid.slice(-8, -4)) : null;
  const trend = last4 != null && prev4 ? (last4 / prev4 - 1) * 100 : null;
  const hi = valid.length ? Math.max(...valid) : 1, lo = valid.length ? Math.min(...valid) * 0.8 : 0;
  const i = sel == null || sel >= list.length ? list.length - 1 : sel;
  const w = list[i];

  if (!list.length) return null;
  return (
    <section className="card span-2 wl">
      <div className="card-head">
        <h2>{t('wl.title')}</h2>
        <span className="label">{t('wl.last', { n: list.length })}</span>
      </div>
      <div className="wl-tabs" role="radiogroup" aria-label={t('wl.metric')}>
        {METRICS.map((x) => (
          <button key={x.k} role="radio" aria-checked={key === x.k} className={key === x.k ? 'is-on' : ''} onClick={() => setKey(x.k)}>{t('wl.m.' + x.k)}</button>
        ))}
      </div>
      <div className="wl-kpis">
        <div className="wg-kpi"><span className="muted small">{t('wl.avg')}</span><strong>{a == null ? '–' : m.f(a)}<small>{a == null ? '' : m.u}</small></strong></div>
        <div className="wg-kpi"><span className="muted small">{t('wl.trend')}</span>
          <strong className={trend == null ? '' : trend >= 0 ? 'wl-up' : 'wl-down'}>{trend == null ? '–' : `${trend >= 0 ? '+' : ''}${Math.round(trend)} %`}</strong>
        </div>
      </div>
      <div className="wl-bars">
        {list.map((x, j) => {
          const v = x[key];
          return (
            <button key={x.id} className={'wl-bar' + (j === i ? ' sel' : '')} onClick={() => setSel(j)}
              aria-label={`${x.name} ${dm(x.startedAt)}: ${v == null ? '–' : m.f(v) + m.u}`}>
              <i style={{ height: v == null ? '2px' : `${8 + (92 * (v - lo)) / Math.max(1e-9, hi - lo)}%` }} className={v == null ? 'empty' : ''} />
            </button>
          );
        })}
      </div>
      <p className="muted small wl-hint">{t('wl.h.' + key)}</p>
      {w && (
        <div className="wl-detail">
          <div><strong>{w.name}</strong> · {dm(w.startedAt)}</div>
          <div className="mono muted small">
            {[
              t('count.exercises', { n: w.exercises }), t('count.sets', { n: w.sets }), `${fmtNum(Math.round(w.volume))} kg`,
              `${Math.round(w.minutes)} min`, w.density != null && `${Math.round(w.density)} kg/min`,
              w.intensity != null && `${Math.round(w.intensity)} %`, w.score != null && `${t('wl.m.score').toLowerCase()} ${Math.round(w.score)}`,
            ].filter(Boolean).join(' · ')}
          </div>
        </div>
      )}
    </section>
  );
}
