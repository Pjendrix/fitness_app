import { num } from '../lib/util.js';
import { t } from '../lib/i18n.js';

// Chytrý krok váhy: malé jednoručky 0,5 kg, střed 1 kg, osa 2,5 kg.
export const weightStep = (w, dir) => {
  const x = dir < 0 ? w - 0.001 : w;
  return x < 10 ? 0.5 : x < 40 ? 1 : 2.5;
};
export const oneStep = () => 1;
const fmtV = (n) => String(Math.round(n * 100) / 100);

// Číselné pole s −/+; psaní je filtrované (jen čísla, max 3 cifry a 2 desetinná místa).
export default function NumField({ label, value, onChange, step, placeholder, mode, pattern }) {
  const bump = (dir) => {
    const cur = num(value);
    const next = Math.min(999, Math.max(0, cur + dir * step(cur, dir)));
    onChange(next ? fmtV(next) : '');
  };
  return (
    <div className="numfield">
      <button type="button" tabIndex={-1} aria-label={t('wo.dec', { what: label })} onClick={() => bump(-1)} disabled={!(num(value) > 0)}>−</button>
      <input aria-label={label} inputMode={mode} enterKeyHint="done" autoComplete="off" placeholder={placeholder} value={value}
        onFocus={(ev) => ev.target.select()}
        onChange={(ev) => { const v = ev.target.value; if (v === '' || pattern.test(v)) onChange(v); }} />
      <button type="button" tabIndex={-1} aria-label={t('wo.inc', { what: label })} onClick={() => bump(1)}>+</button>
    </div>
  );
}

