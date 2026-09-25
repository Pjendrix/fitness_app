import { useRef, useState } from 'react';
import { getLang, t } from '../lib/i18n.js';

// Náhled appky na přihlašovací obrazovce: screenshoty z dema (public/preview, generuje scripts/capture-previews.mjs)
export const SLIDES = ['workout', 'summary', 'stats', 'exercise', 'looks'];

export default function PreviewCarousel() {
  const ref = useRef(null);
  const [i, setI] = useState(0);
  const lang = getLang() === 'cs' ? 'cs' : 'en';
  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const n = Math.round(el.scrollLeft / el.clientWidth);
    if (n !== i) setI(n);
  };
  const goTo = (n) => ref.current?.scrollTo({ left: n * ref.current.clientWidth, behavior: 'smooth' });
  return (
    <section className="pv" aria-roledescription="carousel" aria-label={t('pv.label')}>
      <div className="pv-track" ref={ref} onScroll={onScroll} tabIndex={0}>
        {SLIDES.map((id, n) => (
          <figure key={id} className="pv-slide" aria-roledescription="slide" aria-label={`${n + 1} / ${SLIDES.length}`}>
            <div className="pv-phone">
              <img src={`./preview/${lang}-${n + 1}-${id}.jpg`} alt={t('pv.' + id)} width="390" height="844" loading={n === 0 ? 'eager' : 'lazy'} decoding="async" />
            </div>
            <figcaption><b>{t('pv.' + id)}</b><span>{t('pv.' + id + 'Sub')}</span></figcaption>
          </figure>
        ))}
      </div>
      <div className="pv-dots" role="tablist">
        {SLIDES.map((id, n) => <button key={id} role="tab" aria-selected={i === n} aria-label={t('pv.' + id)} className={i === n ? 'is-on' : ''} onClick={() => goTo(n)} />)}
      </div>
    </section>
  );
}
