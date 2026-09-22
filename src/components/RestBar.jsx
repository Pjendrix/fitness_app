import { useEffect, useRef, useState } from 'react';
import { useSession } from '../lib/store.jsx';
import { beep } from '../lib/rest.js';
import { fmtClock } from '../lib/util.js';
import { t } from '../lib/i18n.js';

// Odpočet pauzy nad navigací. Počítá z časového razítka, takže běží správně i po uspání obrazovky.
export default function RestBar() {
  const { rest, adjustRest, stopRest } = useSession();
  const [now, setNow] = useState(Date.now);
  const rang = useRef(null);

  useEffect(() => {
    if (!rest) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [rest]);

  const left = rest ? rest.until - now : 0;
  const over = Boolean(rest) && left <= 0;
  useEffect(() => {
    if (!rest || !over || rang.current === rest.until) return;
    rang.current = rest.until;
    beep();
    const id = setTimeout(stopRest, 4000);
    return () => clearTimeout(id);
  }, [rest, over, stopRest]);

  if (!rest) return null;
  const pct = Math.max(0, Math.min(100, (left / (rest.total * 1000)) * 100));
  return (
    <div className={'rest-bar' + (over ? ' is-over' : '')} role="timer" aria-live={over ? 'assertive' : 'off'}>
      <i className="rest-fill" style={{ width: `${pct}%` }} aria-hidden="true" />
      <span className="rest-label">{over ? t('rest.done') : t('rest.title')}</span>
      {!over && <span className="rest-time">{fmtClock(left + 999)}</span>}
      <span className="spacer" />
      {!over && <button className="rest-btn" onClick={() => adjustRest(-15)} aria-label={t('rest.minusAria')}>−15</button>}
      {!over && <button className="rest-btn" onClick={() => adjustRest(15)} aria-label={t('rest.plusAria')}>+15</button>}
      <button className="rest-btn" onClick={stopRest}>{over ? t('pick.close') : t('rest.skip')}</button>
    </div>
  );
}
