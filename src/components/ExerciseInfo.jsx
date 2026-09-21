import { useEffect, useState } from 'react';
import { exKey } from '../lib/util.js';
import { t } from '../lib/i18n.js';

// Instructions + photos from free-exercise-db (github.com/yuhonas/free-exercise-db, public domain).
const IMG = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
let cache = null;
const loadInfo = () => (cache ||= import('../data/exerciseInfo.json').then((m) => m.default));

export function InfoButton({ name }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="info-btn" aria-label={t('info.open', { name })} title={t('info.title')} onClick={(e) => { e.stopPropagation(); setOpen(true); }}>i</button>
      {open && <InfoSheet name={name} onClose={() => setOpen(false)} />}
    </>
  );
}

function InfoSheet({ name, onClose }) {
  const [info, setInfo] = useState(undefined);
  const [frame, setFrame] = useState(0);
  useEffect(() => { loadInfo().then((all) => setInfo(all[exKey(name)] || null)).catch(() => setInfo(null)); }, [name]);
  // Alternate start/end photo → simple motion preview
  useEffect(() => {
    if (!info?.images?.length) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % info.images.length), 1200);
    return () => clearInterval(id);
  }, [info]);
  const yt = `https://www.youtube.com/results?search_query=${encodeURIComponent(name + ' exercise form')}`;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet info-sheet" role="dialog" aria-label={name} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h2>{name}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>{t('pick.close')}</button>
        </div>
        <div className="info-body">
          {info === undefined && <p className="empty">{t('hist.loading')}</p>}
          {info && (
            <>
              <div className="info-photos">
                {info.images.map((src, i) => (
                  <img key={src} src={IMG + src} alt="" loading="lazy" className={i === frame ? 'is-on' : ''} />
                ))}
              </div>
              <div className="info-meta">
                {[info.level, info.equipment, ...(info.muscles || [])].filter(Boolean).map((m) => <span key={m} className="type-tag">{m}</span>)}
              </div>
              <ol className="info-steps">{info.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
              <p className="label info-src">{t('info.source', { name: info.src })}</p>
            </>
          )}
          {info === null && <p className="empty">{t('info.none')}</p>}
          <a className="btn btn-ghost btn-block" href={yt} target="_blank" rel="noreferrer">{t('info.video')}</a>
        </div>
      </div>
    </div>
  );
}
