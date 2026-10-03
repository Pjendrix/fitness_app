import { useMemo, useState } from 'react';
import Sheet from './Sheet.jsx';
import { useStore } from '../lib/store.jsx';
import { monthRecap, ROMAN } from '../lib/gamify.js';
import { locale, t } from '../lib/i18n.js';
import { fmtNum, fmtSet } from '../lib/util.js';

const monthName = (ms, opts = { month: 'long' }) => new Date(ms).toLocaleDateString(locale(), opts);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Barva sloupce Heatu (pro sheet i obrázek)
const barColor = (h) => (h >= 80 ? '#fb923c' : h >= 50 ? '#ea580c' : h >= 25 ? '#9a3412' : '#525252');

function headline(r, goal) {
  if (r.weeks > 0 && r.weeksMet === r.weeks) return t('recap.h.perfect');
  if (r.workouts >= goal * r.weeks * 0.75) return t('recap.h.strong');
  return t('recap.h.steady');
}

function highlights(r, groupLabel) {
  const out = [];
  if (r.best) out.push([t('recap.best'), `${r.best.name} · ${fmtSet(r.best.weight, r.best.reps)}`]);
  if (r.jump) out.push([t('recap.jump'), t('recap.jumpV', { ex: r.jump.name, v: fmtNum(r.jump.delta) })]);
  if (r.gained.length) out.push([t('recap.gained'), r.gained.slice(0, 3).map((g) => `${t('mile.' + g.id)} ${ROMAN[g.tier]}`).join(' · ')]);
  if (r.topGroup) out.push([t('recap.top'), `${groupLabel(r.topGroup.group)} · ${r.topGroup.n}×`]);
  out.push([t('recap.volume'), `${fmtNum(Math.round(r.volume / 100) / 10)} t`]);
  return out;
}

// Obrázek 1080×1350 (poměr 4:5 – Instagram, galerie) kreslený přímo na canvas, bez knihoven
async function drawImage(r, { title, month, stats, rows, heatLabel }) {
  const W = 1080, H = 1350, P = 88;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  try { await document.fonts?.ready; } catch { /* ignore */ }
  const sans = (w, s) => `${w} ${s}px "Geist Sans", Geist, system-ui, sans-serif`;
  const mono = (w, s) => `${w} ${s}px "Geist Mono", ui-monospace, monospace`;
  x.fillStyle = '#171717'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#a3a3a3'; x.font = mono(500, 28); x.fillText(month.toUpperCase(), P, P + 30);
  x.fillStyle = '#ffffff'; x.font = sans(450, 92);
  title.split('\n').forEach((line, i) => x.fillText(line, P, P + 150 + i * 100));
  // Tři čísla
  const colW = (W - 2 * P) / 3;
  stats.forEach(([v, l], i) => {
    x.fillStyle = '#ffffff'; x.font = mono(500, 84); x.fillText(v, P + i * colW, 560);
    x.fillStyle = '#a3a3a3'; x.font = sans(400, 30); x.fillText(l, P + i * colW, 610);
  });
  // Heat po dnech
  x.fillStyle = '#a3a3a3'; x.font = mono(500, 24); x.fillText(heatLabel.toUpperCase(), P, 700);
  const n = r.heat.length, gap = 6, bw = (W - 2 * P - gap * (n - 1)) / n, base = 880, hMax = 150;
  r.heat.forEach((h, i) => {
    const v = h ?? 0;
    const bh = Math.max(4, (v / 100) * hMax);
    x.fillStyle = h == null ? '#262626' : barColor(v);
    x.fillRect(P + i * (bw + gap), base - bh, bw, bh);
  });
  // Highlights
  let y = 960;
  x.font = sans(400, 32);
  for (const [l, v] of rows.slice(0, 4)) {
    x.fillStyle = '#404040'; x.fillRect(P, y - 44, W - 2 * P, 1);
    x.fillStyle = '#a3a3a3'; x.font = sans(400, 30); x.fillText(l, P, y);
    x.fillStyle = '#ffffff'; x.font = mono(400, 30);
    const maxW = W - 2 * P - 340;
    let txt = v;
    while (txt.length > 4 && x.measureText(txt).width > maxW) txt = txt.slice(0, -2).trimEnd() + '…';
    x.fillText(txt, W - P - x.measureText(txt).width, y);
    y += 76;
  }
  x.fillStyle = '#fb923c'; x.font = mono(500, 26); x.fillText('FORGE', P, H - P + 10);
  return new Promise((res) => c.toBlob(res, 'image/png'));
}

// Měsíční kapitola: shrnutí měsíce, průběh Heatu, highlights, uložení jako obrázek
export default function MonthlyRecap({ month, onClose }) {
  const { workouts, weeklyGoal, main, body, strengthScale, groupLabel, notify } = useStore();
  const groups = useMemo(() => main.groups.map((g) => g.id), [main]);
  const r = useMemo(() => monthRecap(workouts, { month, goal: weeklyGoal, groups, body, scale: strengthScale }), [workouts, month, weeklyGoal, groups, body, strengthScale]);
  const [busy, setBusy] = useState(false);
  const title = headline(r, weeklyGoal);
  const label = cap(monthName(month, { month: 'long', year: 'numeric' }));
  const stats = [[String(r.workouts), t('recap.workouts')], [String(r.records), t('recap.records')], [`${r.weeksMet}/${r.weeks}`, t('recap.weeks')]];
  const rows = highlights(r, groupLabel);

  const save = async () => {
    setBusy(true);
    try {
      const blob = await drawImage(r, { title, month: label, stats, rows, heatLabel: t('recap.heat') });
      const name = `forge-${new Date(month).getFullYear()}-${String(new Date(month).getMonth() + 1).padStart(2, '0')}.png`;
      const file = new File([blob], name, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Forge · ${label}` }).catch(() => {});
      } else {
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement('a'), { href: url, download: name });
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }
    } catch (e) {
      console.warn('recap image', e);
      notify(t('recap.imgFail'));
    } finally { setBusy(false); }
  };

  return (
    <Sheet label={t('recap.aria', { m: label })} onClose={onClose} className="sheet-recap">
      <div className="sheet-head"><span className="label">{t('recap.chapter', { m: label })}</span><button className="btn btn-ghost btn-sm" onClick={onClose}>{t('pick.close')}</button></div>
      <div className="recap-scroll">
        <section className="card card-hero recap-hero">
          <span className="label">{label}</span>
          <h2 className="recap-title">{title}</h2>
          <div className="recap-stats">
            {stats.map(([v, l]) => <div key={l}><strong className="mono">{v}</strong><span>{l}</span></div>)}
          </div>
          <span className="label">{t('recap.heat')}</span>
          <div className="recap-bars" role="img" aria-label={t('recap.heatAria')}>
            {r.heat.map((h, i) => <i key={i} style={{ height: `${Math.max(4, h ?? 0)}%`, background: h == null ? 'transparent' : barColor(h) }} />)}
          </div>
        </section>
        <section className="card list recap-list">
          <h3 className="recap-h">{t('recap.highlights')}</h3>
          {rows.map(([l, v]) => <div key={l} className="row"><span>{l}</span><span className="mono small recap-v">{v}</span></div>)}
        </section>
      </div>
      <div className="recap-actions">
        <button className="btn btn-ghost" disabled={busy} onClick={save}>{t('recap.save')}</button>
        <button className="btn btn-primary" onClick={onClose}>{t('recap.next', { m: cap(monthName(new Date(month).setMonth(new Date(month).getMonth() + 1))) })}</button>
      </div>
    </Sheet>
  );
}
