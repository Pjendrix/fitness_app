// Lehké SVG grafy bez závislostí, černobílé.
import { useLayoutEffect, useRef, useState } from 'react';

// Šířka kontejneru v px → SVG se kreslí 1:1, texty os se nedeformují.
function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(600);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}
import { fmtNum } from '../lib/util.js';

const niceMax = (v) => {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((m) => m >= v);
};

export function BarChart({ data, unit = '', height = 180, format = fmtNum }) {
  const [hover, setHover] = useState(null);
  const [ref, W] = useWidth();
  const H = height, pad = { l: 36, r: 8, t: 12, b: 24 };
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const bw = iw / Math.max(data.length, 1);
  const every = Math.ceil(data.length / Math.max(2, Math.floor(W / 70)));
  return (
    <div className="chart" ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Sloupcový graf">
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih * (1 - f)} y2={pad.t + ih * (1 - f)} className="grid" />
            <text x={pad.l - 6} y={pad.t + ih * (1 - f) + 3} className="axis" textAnchor="end">{format(max * f)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const h = (d.value / max) * ih;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => setHover(i)}>
              <rect x={pad.l + i * bw} y={pad.t} width={bw} height={ih} fill="transparent" />
              <rect x={pad.l + i * bw + bw * 0.18} y={pad.t + ih - h} width={bw * 0.64} height={Math.max(h, d.value ? 1 : 0)} className={'bar' + (hover === i ? ' is-hover' : '')} rx="2" />
              {i % every === 0 && <text x={pad.l + i * bw + bw / 2} y={H - 6} className="axis" textAnchor="middle">{d.label}</text>}
            </g>
          );
        })}
      </svg>
      <div className="chart-tip label">{hover != null ? `${data[hover].title || data[hover].label}: ${format(data[hover].value)}${unit}` : '\u00a0'}</div>
    </div>
  );
}

export function LineChart({ series, height = 200, unit = '' }) {
  const [hover, setHover] = useState(null);
  const [ref, W] = useWidth();
  const H = height, pad = { l: 36, r: 12, t: 12, b: 24 };
  const pts = series.flatMap((s) => s.points);
  if (!pts.length) return <p className="empty" ref={ref}>Zatím málo dat.</p>;
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs) || x0 + 1;
  const yMin = Math.max(0, Math.floor(Math.min(...ys) * 0.9));
  const yMax = niceMax(Math.max(...ys) * 1.02);
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const sx = (x) => pad.l + (x1 === x0 ? iw / 2 : ((x - x0) / (x1 - x0)) * iw);
  const sy = (y) => pad.t + ih * (1 - (y - yMin) / (yMax - yMin || 1));
  const main = series[0].points;
  const date = (t) => new Date(t).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });
  return (
    <div className="chart" ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Spojnicový graf"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - r.left) / r.width) * W;
          let best = 0;
          main.forEach((p, i) => { if (Math.abs(sx(p.x) - x) < Math.abs(sx(main[best].x) - x)) best = i; });
          setHover(best);
        }}>
        {[0, 0.5, 1].map((f) => {
          const v = yMin + (yMax - yMin) * f;
          return (
            <g key={f}>
              <line x1={pad.l} x2={W - pad.r} y1={sy(v)} y2={sy(v)} className="grid" />
              <text x={pad.l - 6} y={sy(v) + 3} className="axis" textAnchor="end">{fmtNum(Math.round(v))}</text>
            </g>
          );
        })}
        <text x={pad.l} y={H - 6} className="axis">{date(x0)}</text>
        <text x={W - pad.r} y={H - 6} className="axis" textAnchor="end">{date(x1)}</text>
        {series.map((s, si) => (
          <g key={si} className={'line line-' + si}>
            <polyline fill="none" points={s.points.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ')} vectorEffect="non-scaling-stroke" />
            {s.points.map((p, i) => <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={hover === i && si === 0 ? 4.5 : 2.5} vectorEffect="non-scaling-stroke" />)}
          </g>
        ))}
        {hover != null && <line x1={sx(main[hover].x)} x2={sx(main[hover].x)} y1={pad.t} y2={pad.t + ih} className="cursor" />}
      </svg>
      <div className="chart-tip label">
        {hover != null
          ? `${date(main[hover].x)} · ` + series.map((s) => `${s.name} ${fmtNum(Math.round((s.points[hover]?.y ?? 0) * 10) / 10)}${unit}`).join(' · ')
          : series.map((s, i) => <span key={i} className={'legend legend-' + i}>{s.name}</span>)}
      </div>
    </div>
  );
}

export function HBars({ data, format = fmtNum }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="hbars">
      {data.map((d) => (
        <div className="hbar" key={d.label}>
          <span className="hbar-label">{d.label}</span>
          <span className="hbar-track"><i style={{ width: `${(d.value / max) * 100}%` }} /></span>
          <span className="hbar-val label">{format(d.value)}</span>
        </div>
      ))}
    </div>
  );
}

// Kalendářová mřížka posledních N týdnů (řádky = dny Po–Ne)
export function Heatmap({ days, weeks = 18 }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dow = (today.getDay() + 6) % 7;
  const start = new Date(today); start.setDate(today.getDate() - dow - (weeks - 1) * 7);
  const cells = [];
  for (let w = 0; w < weeks; w++) for (let d = 0; d < 7; d++) {
    const t = new Date(start); t.setDate(start.getDate() + w * 7 + d);
    cells.push({ w, d, t: t.getTime(), v: days[t.toDateString()] || 0, future: t > today });
  }
  const s = 14, g = 3;
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${weeks * (s + g) + 20} ${7 * (s + g)}`} className="heatmap" role="img" aria-label="Kalendář tréninků">
        {['Po', 'St', 'Pá'].map((l, i) => <text key={l} x="0" y={i * 2 * (s + g) + 11} className="axis">{l}</text>)}
        {cells.map((c) => (
          <rect key={c.t} x={20 + c.w * (s + g)} y={c.d * (s + g)} width={s} height={s} rx="2"
            className={c.future ? 'hm-future' : c.v ? 'hm-on' : 'hm-off'}>
            <title>{new Date(c.t).toLocaleDateString('cs-CZ')}{c.v ? ` · ${c.v}× trénink` : ''}</title>
          </rect>
        ))}
      </svg>
    </div>
  );
}
