import { useState } from 'react';
import Sheet from './Sheet.jsx';
import { useStore } from '../lib/store.jsx';
import { ACTIVITY_KINDS, ACTIVITY_MAX_MIN } from '../lib/cardio.js';
import { locale, t } from '../lib/i18n.js';
import { TrashIcon } from './Icons.jsx';

const QUICK = [15, 20, 30, 45, 60];
const DAY = 864e5;
const dayLabel = (ms) => new Date(ms).toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'numeric' });

// Kardio: rychlý záznam (druh, minuty, intenzita, den) + přehled týdne. Bez kalorií, tempa a GPS – jen minuty podle WHO.
export default function CardioSheet({ start = 'list', week, mon, onClose }) {
  const { saveActivity, deleteActivity, cardioGoal, notify } = useStore();
  const [adding, setAdding] = useState(start === 'add');
  const [kind, setKind] = useState('walk');
  const [minutes, setMinutes] = useState('30');
  const [vigorous, setVigorous] = useState(false);
  const [day, setDay] = useState(0); // 0 dnes, 1 včera, 2 předevčírem
  const min = parseInt(minutes, 10);
  const valid = min >= 1 && min <= ACTIVITY_MAX_MIN;

  const save = () => {
    if (!valid) return;
    const when = Date.now() - day * DAY;
    if (saveActivity({ kind, minutes: min, vigorous, when })) {
      notify(t('cardio.saved', { n: min * (vigorous ? 2 : 1) }));
      setAdding(false);
      if (start === 'add') onClose();
    }
  };
  const left = cardioGoal ? Math.max(0, cardioGoal - week.total) : 0;
  const items = week.items;

  return (
    <Sheet label={t('cardio.title')} onClose={onClose} className="sheet-short cardio-sheet">
      <div className="sheet-head"><h2>{t('cardio.title')}</h2><button className="btn btn-ghost btn-sm" onClick={onClose}>{t('pick.close')}</button></div>

      <div className="cardio-sum">
        <strong className="mono">{week.total}<small>{cardioGoal ? ` / ${cardioGoal}` : ''} min</small></strong>
        <span className="muted small">{cardioGoal ? (left ? t('cardio.left', { n: left }) : t('cardio.met')) : t('cardio.noGoal')}</span>
        {cardioGoal > 0 && <i className="week-cardio-meter" aria-hidden="true"><i style={{ width: `${Math.min(100, (week.total / cardioGoal) * 100)}%` }} /></i>}
        <span className="muted small">{[t('cardio.splitM', { n: week.moderate }), week.vigorous > 0 && t('cardio.splitV', { n: week.vigorous }), week.gym > 0 && t('cardio.splitG', { n: week.gym })].filter(Boolean).join(' · ')}</span>
      </div>

      {adding ? (
        <div className="cardio-form">
          <span className="label">{t('cardio.kind')}</span>
          <div className="rpe-chips" role="radiogroup" aria-label={t('cardio.kind')}>
            {ACTIVITY_KINDS.map((k) => <button key={k} type="button" role="radio" aria-checked={kind === k} className={'chip' + (kind === k ? ' is-on' : '')} onClick={() => setKind(k)}>{t('cardio.k.' + k)}</button>)}
          </div>
          <label className="cardio-min">
            <span className="label">{t('cardio.minutes')}</span>
            <input className="input" inputMode="numeric" pattern="[0-9]*" maxLength={3} value={minutes} onChange={(e) => /^\d{0,3}$/.test(e.target.value) && setMinutes(e.target.value)} data-autofocus />
          </label>
          <div className="rpe-chips" aria-hidden="false">
            {QUICK.map((q) => <button key={q} type="button" className={'chip' + (min === q ? ' is-on' : '')} onClick={() => setMinutes(String(q))}>{q}</button>)}
          </div>
          <span className="label">{t('cardio.intensity')}</span>
          <div className="seg seg-sm" role="radiogroup" aria-label={t('cardio.intensity')}>
            <button role="radio" aria-checked={!vigorous} className={!vigorous ? 'is-on' : ''} onClick={() => setVigorous(false)}>{t('cardio.moderate')}</button>
            <button role="radio" aria-checked={vigorous} className={vigorous ? 'is-on' : ''} onClick={() => setVigorous(true)}>{t('cardio.vigorous')}</button>
          </div>
          <span className="muted small">{t(vigorous ? 'cardio.vigorousHelp' : 'cardio.moderateHelp')}</span>
          <div className="seg seg-sm" role="radiogroup" aria-label={t('cardio.day')}>
            {[0, 1, 2].map((d) => <button key={d} role="radio" aria-checked={day === d} className={day === d ? 'is-on' : ''} onClick={() => setDay(d)}>{d === 0 ? t('week.today') : d === 1 ? t('week.yesterday') : dayLabel(Date.now() - 2 * DAY)}</button>)}
          </div>
          <button className="btn btn-primary btn-block" disabled={!valid} onClick={save}>{t('cardio.save')}</button>
          {start !== 'add' && <button className="btn btn-ghost btn-block" onClick={() => setAdding(false)}>{t('dlg.cancel')}</button>}
        </div>
      ) : (
        <>
          <button className="btn btn-primary btn-block" onClick={() => setAdding(true)}>{t('cardio.add')}</button>
          {items.length > 0 || week.gym > 0 ? (
            <div className="list cardio-list">
              {items.map((a) => (
                <div key={a.id} className="row">
                  <span className="grow">{t('cardio.k.' + a.kind)} · <span className="mono">{a.minutes} min</span>{a.vigorous && <span className="muted"> · {t('cardio.vigorousShort')}</span>}<span className="muted small row-sub">{dayLabel(a.date)}</span></span>
                  <button className="icon-btn" aria-label={t('cardio.delete')} onClick={() => deleteActivity(a.id)}><TrashIcon width={16} height={16} /></button>
                </div>
              ))}
              {week.gym > 0 && <div className="row"><span className="grow muted small">{t('cardio.fromGym', { n: week.gym })}</span></div>}
            </div>
          ) : <p className="muted small">{t('cardio.empty', { d: dayLabel(mon) })}</p>}
          <p className="muted small cardio-note">{t('cardio.note')}</p>
        </>
      )}
    </Sheet>
  );
}
