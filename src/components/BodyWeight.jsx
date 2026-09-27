// E3: tělesná váha – dlaždice na Domů + panel pro zápis a posledních pár záznamů
import { useMemo, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import Sheet from './Sheet.jsx';
import NumField from './NumField.jsx';
import { TrashIcon } from './Icons.jsx';
import { LineChart } from './Charts.jsx';
import { bodyTrend, dayId, validBody } from '../lib/body.js';
import { DECIMAL_INPUT, fmtDate, fmtNum, num } from '../lib/util.js';
import { t } from '../lib/i18n.js';

const tenth = () => 0.1;
const signed = (n) => (n > 0 ? '+' : n < 0 ? '−' : '±') + fmtNum(Math.abs(n));

export function BodySheet({ onClose }) {
  const { body, saveBodyWeight, deleteBodyWeight, notify } = useStore();
  const today = dayId(Date.now());
  const [day, setDay] = useState(today);
  const initial = body.find((b) => b.id === today)?.weight ?? body[0]?.weight ?? '';
  const [value, setValue] = useState(initial === '' ? '' : String(initial));
  const save = () => {
    const when = new Date(day + 'T12:00:00').getTime();
    if (!validBody(value) || !Number.isFinite(when)) return notify(t('body.bad'));
    saveBodyWeight(num(value), when);
    notify(t('body.saved', { w: fmtNum(Math.round(num(value) * 10) / 10) }));
    onClose();
  };
  return (
    <Sheet label={t('body.title')} onClose={onClose} className="sheet-short">
      <div className="sheet-head"><h2>{t('body.title')}</h2><button className="btn btn-ghost btn-sm" onClick={onClose}>{t('pick.close')}</button></div>
      <div className="body-form">
        <label className="mini"><span className="label">{t('body.date')}</span>
          <input className="input" type="date" value={day} max={today} onChange={(e) => setDay(e.target.value || today)} />
        </label>
        <div className="mini"><span className="label">kg</span>
          <NumField label={t('body.title')} placeholder="kg" mode="decimal" pattern={DECIMAL_INPUT} value={value} step={tenth} onChange={setValue} />
        </div>
      </div>
      <button className="btn btn-primary btn-block" onClick={save} disabled={!validBody(value)}>{t('body.save')}</button>
      <p className="muted small">{t('body.help')}</p>
      {body.length > 0 && (
        <div className="card list body-list">
          {body.slice(0, 8).map((b) => (
            <div key={b.id} className="row">
              <span>{fmtDate(b.date)}</span>
              <span className="row-end"><span className="mono">{fmtNum(b.weight)} kg</span>
                <button className="icon-btn danger" aria-label={t('body.delete')} onClick={() => deleteBodyWeight(b.id)}><TrashIcon width={16} height={16} /></button>
              </span>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}

export default function BodyCard() {
  const { body } = useStore();
  const [open, setOpen] = useState(false);
  const trend = useMemo(() => bodyTrend(body, 30), [body]);
  return (
    <>
      <button className="card body-card" onClick={() => setOpen(true)} aria-label={t('body.log')}>
        <span className="body-main">
          <span className="label">{t('body.title')}</span>
          {trend
            ? <span className="body-now"><span className="num">{fmtNum(trend.now)}</span><small> kg</small>{trend.delta != null && <span className="muted small"> {signed(trend.delta)} kg {t('body.in30')}</span>}</span>
            : <span className="muted small">{t('body.empty')}</span>}
        </span>
        <span className="btn btn-ghost btn-sm body-log">{t('body.log')}</span>
      </button>
      {open && <BodySheet onClose={() => setOpen(false)} />}
    </>
  );
}

// Graf tělesné váhy za zvolené období statistik (týdny)
export function BodyChart({ weeks }) {
  const { body } = useStore();
  const [open, setOpen] = useState(false);
  const points = useMemo(() => {
    const from = Date.now() - weeks * 7 * 864e5;
    return body.filter((b) => b.date >= from).sort((a, b) => a.date - b.date).map((b) => ({ x: b.date, y: b.weight }));
  }, [body, weeks]);
  const first = points[0], last = points[points.length - 1];
  return (
    <section className="card">
      <div className="card-head"><h2>{t('body.title')}</h2><button className="link" onClick={() => setOpen(true)}>{t('body.log')}</button></div>
      {points.length ? (
        <>
          <div className="ms-now">
            <span className="num">{fmtNum(last.y)}<small> kg</small></span>
            {points.length > 1 && <span className="mono small muted">{signed(Math.round((last.y - first.y) * 10) / 10)} kg · {t('body.since', { d: fmtDate(first.x) })}</span>}
          </div>
          {points.length > 1 ? <LineChart label={t('body.title')} unit=" kg" height={160} series={[{ name: t('body.title'), points }]} /> : <p className="muted small">{t('body.more')}</p>}
        </>
      ) : <p className="muted small">{t('body.emptyRange')}</p>}
      {open && <BodySheet onClose={() => setOpen(false)} />}
    </section>
  );
}
