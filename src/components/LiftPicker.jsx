import { useMemo, useState } from 'react';
import Sheet from './Sheet.jsx';
import { useStore } from '../lib/store.jsx';
import { liftCandidates, MAX_SELF_LIFTS } from '../lib/gamify.js';
import { t } from '../lib/i18n.js';

// Výběr cviků pro silové milníky (max. 4). Prázdný výběr = automaticky (big three / nejčastější vícekloubové).
export default function LiftPicker({ onClose }) {
  const { workouts, strengthLifts, setStrengthLifts } = useStore();
  const all = useMemo(() => liftCandidates(workouts), [workouts]);
  const [sel, setSel] = useState(strengthLifts);
  const toggle = (k) => setSel((s) => (s.includes(k) ? s.filter((x) => x !== k) : s.length >= MAX_SELF_LIFTS ? s : [...s, k]));
  const save = (list) => { setStrengthLifts(list); onClose(); };
  const compound = all.filter((x) => x.compound), other = all.filter((x) => !x.compound);
  const row = (x) => {
    const on = sel.includes(x.key);
    return (
      <label key={x.key} className={'row lift-pick' + (on ? ' is-on' : '')}>
        <input type="checkbox" checked={on} disabled={!on && sel.length >= MAX_SELF_LIFTS} onChange={() => toggle(x.key)} />
        <span className="grow">{x.name}</span>
        <span className="muted small mono">{t('mile.u.sessions', { n: x.n })}</span>
      </label>
    );
  };
  return (
    <Sheet label={t('lp.title')} onClose={onClose} className="sheet-short lift-sheet">
      <div className="sheet-head"><h2>{t('lp.title')}</h2><button className="btn btn-ghost btn-sm" onClick={onClose}>{t('pick.close')}</button></div>
      <p className="muted small">{t('lp.help', { n: MAX_SELF_LIFTS })}</p>
      <div className="lift-list">
        {compound.length > 0 && <><span className="label">{t('lp.compound')}</span><div className="list">{compound.map(row)}</div></>}
        {other.length > 0 && <><span className="label">{t('lp.other')}</span><div className="list">{other.map(row)}</div></>}
        {!all.length && <p className="empty">{t('mile.liftNone')}</p>}
      </div>
      <div className="lift-actions">
        <button className="btn btn-ghost" onClick={() => save([])}>{t('lp.auto')}</button>
        <button className="btn btn-primary" onClick={() => save(sel)} disabled={!sel.length}>{t('lp.save', { n: sel.length })}</button>
      </div>
    </Sheet>
  );
}
