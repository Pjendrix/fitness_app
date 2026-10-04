import { useEffect, useState } from 'react';
import { PRINCIPLES, LEVELS } from '../data/principles.js';
import { getLang, t } from '../lib/i18n.js';

// „Proč to tak funguje“ (jen v desktopovém menu): pravidla aplikace, krátké zdůvodnění a zdroje.
// Obsah je v src/data/principles.js (cs + en). Vlevo obsah kapitol, vpravo rozbalovací pravidla.
export default function Why() {
  const lang = getLang();
  const tx = (o) => o[lang] || o.en;
  const [openAll, setOpenAll] = useState(false);
  const [gen, setGen] = useState(0); // přegenerovat <details> po „rozbalit vše“
  useEffect(() => { window.scrollTo({ top: 0 }); }, []);
  const jump = (id) => document.getElementById('why-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const count = PRINCIPLES.reduce((n, c) => n + c.items.length, 0);

  return (
    <div className="screen screen-wide why">
      <header className="screen-head">
        <p className="label">{t('why.eyebrow', { n: count })}</p>
        <h1>{t('why.title')}</h1>
        <p className="muted why-intro">{t('why.intro')}</p>
      </header>
      <div className="why-grid">
        <aside className="why-side">
          <nav className="card why-toc" aria-label={t('why.toc')}>
            <span className="label">{t('why.toc')}</span>
            {PRINCIPLES.map((c) => (
              <button key={c.id} className="why-toc-link" onClick={() => jump(c.id)}>
                <span>{tx(c.title)}</span><span className="mono small muted">{c.items.length}</span>
              </button>
            ))}
            <button className="btn btn-ghost btn-sm" onClick={() => { setOpenAll(!openAll); setGen((g) => g + 1); }}>{openAll ? t('why.collapse') : t('why.expand')}</button>
          </nav>
          <section className="card why-legend">
            <span className="label">{t('why.levels')}</span>
            {LEVELS.map((l) => <p key={l} className="small"><span className={'why-level is-' + l}>{t('why.level.' + l)}</span> {t('why.levelText.' + l)}</p>)}
            <p className="small muted">{t('why.note')}</p>
          </section>
        </aside>
        <div className="why-main">
          {PRINCIPLES.map((c) => (
            <section key={c.id} id={'why-' + c.id} className="why-chapter">
              <h2>{tx(c.title)}</h2>
              <div className="card why-list">
                {c.items.map((it) => (
                  <details key={it.id + gen} className="why-item" open={openAll}>
                    <summary>
                      <span className="why-item-title">{tx(it.title)}</span>
                      <span className={'why-level is-' + it.level}>{t('why.level.' + it.level)}</span>
                    </summary>
                    <div className="why-body">
                      <div><span className="label">{t('why.rule')}</span><p>{tx(it.rule)}</p></div>
                      <div><span className="label">{t('why.why')}</span><p>{tx(it.why)}</p></div>
                      <div>
                        <span className="label">{t('why.sources')}</span>
                        <ul className="why-src">
                          {it.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a></li>)}
                        </ul>
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
