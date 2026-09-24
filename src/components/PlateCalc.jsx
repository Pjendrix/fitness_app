import { useState } from 'react';
import Sheet from './Sheet.jsx';
import NumField, { weightStep } from './NumField.jsx';
import { DECIMAL_INPUT, fmtNum, num } from '../lib/util.js';
import { t } from '../lib/i18n.js';

// W13: kalkulačka kotoučů – kolik naložit na každou stranu osy.
const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
const BARS = [20, 15, 10];
const KEY = 'forge:bar';
const getBar = () => { try { return Number(localStorage.getItem(KEY)) || 20; } catch { return 20; } };

export function platesFor(total, bar) {
  let side = Math.round(((total - bar) / 2) * 100) / 100;
  if (side <= 0) return { plates: [], rest: 0 };
  const plates = [];
  for (const p of PLATES) while (side >= p - 1e-9) { plates.push(p); side = Math.round((side - p) * 100) / 100; }
  return { plates, rest: side };
}

export default function PlateCalc({ initial, onClose }) {
  const [w, setW] = useState(initial > 0 ? String(initial) : '');
  const [bar, setBarState] = useState(getBar);
  const setBar = (b) => { setBarState(b); try { localStorage.setItem(KEY, String(b)); } catch { /* ignore */ } };
  const total = num(w);
  const { plates, rest } = platesFor(total, bar);
  return (
    <Sheet label={t('plate.title')} onClose={onClose} className="sheet-short">
      <div className="sheet-head"><h2>{t('plate.title')}</h2><button className="btn btn-ghost btn-sm" onClick={onClose}>{t('pick.close')}</button></div>
      <div className="plate-in">
        <span className="label">{t('plate.total')}</span>
        <NumField label={t('plate.total')} placeholder="0" mode="decimal" pattern={DECIMAL_INPUT} value={w} step={weightStep} onChange={setW} />
      </div>
      <div className="row-between">
        <span className="label">{t('plate.bar')}</span>
        <div className="seg seg-sm seg-inline" role="radiogroup" aria-label={t('plate.bar')}>
          {BARS.map((b) => <button key={b} role="radio" aria-checked={bar === b} className={bar === b ? 'is-on' : ''} onClick={() => setBar(b)}>{b} kg</button>)}
        </div>
      </div>
      {total > 0 && total < bar && <p className="muted small">{t('plate.light', { bar })}</p>}
      {total >= bar && (
        <>
          <p className="label">{t('plate.perSide')}</p>
          {plates.length ? (
            <div className="plate-viz" aria-label={plates.map(fmtNum).join(', ')}>
              <i className="plate-bar" />
              {plates.map((p, i) => <span key={i} className="plate" style={{ height: `${36 + p * 2.4}px` }}>{fmtNum(p)}</span>)}
            </div>
          ) : <p className="muted small">{t('plate.empty')}</p>}
          {rest > 0 && <p className="muted small">{t('plate.rest', { n: fmtNum(rest * 2) })}</p>}
        </>
      )}
    </Sheet>
  );
}
