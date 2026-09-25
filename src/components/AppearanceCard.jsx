import { useStore } from '../lib/store.jsx';
import { ACCENTS, TINTS } from '../lib/appearance.js';
import { t } from '../lib/i18n.js';

// Vzhled účtu: podbarvení pozadí, jeho intenzita a akcentní barva tlačítek. Ukládá se do účtu.
function Swatches({ label, list, value, onPick }) {
  const custom = value && !list.includes(value);
  return (
    <div className="swatches" role="radiogroup" aria-label={label}>
      <button role="radio" aria-checked={!value} aria-label={t('look.none')} title={t('look.none')} className={'swatch is-none' + (!value ? ' is-on' : '')} onClick={() => onPick(null)} />
      {list.map((c) => <button key={c} role="radio" aria-checked={value === c} aria-label={c} className={'swatch' + (value === c ? ' is-on' : '')} style={{ '--sw': c }} onClick={() => onPick(c)} />)}
      <label className={'swatch swatch-custom' + (custom ? ' is-on' : '')} title={t('look.custom')} style={custom ? { background: value } : undefined}>
        <input type="color" aria-label={t('look.custom')} value={value || '#888888'} onChange={(e) => onPick(e.target.value)} />
      </label>
    </div>
  );
}

export default function AppearanceCard() {
  const { appearance, setAppearance } = useStore();
  const look = { tint: null, strength: 50, accent: null, ...(appearance || {}) };
  return (
    <section className="card look">
      <div><h2>{t('look.title')}</h2><p className="muted small">{t('look.sub')}</p></div>
      <span className="label">{t('look.tint')}</span>
      <Swatches label={t('look.tint')} list={TINTS} value={look.tint} onPick={(tint) => setAppearance({ tint })} />
      <label className="label" htmlFor="look-strength">{t('look.strength', { n: look.strength })}</label>
      <input id="look-strength" type="range" min={10} max={100} step={5} disabled={!look.tint} value={look.strength} onChange={(e) => setAppearance({ strength: Number(e.target.value) })} />
      <span className="label">{t('look.accent')}</span>
      <Swatches label={t('look.accent')} list={ACCENTS} value={look.accent} onPick={(accent) => setAppearance({ accent })} />
      <div className="look-preview" aria-hidden="true">
        <span className="btn btn-primary btn-sm">{t('look.preview')}</span>
        <span className="chip is-on">RPE 8</span>
        <span className="prof-badge">A</span>
      </div>
    </section>
  );
}
