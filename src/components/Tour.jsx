// Průvodce demem: ~1 minuta v rozběhnutém tréninku. Zvýrazní prvek, bublina s textem, Další / Přeskočit.
// Stránka zůstává klikací (výřez i ztmavení mají pointer-events: none).
import { useCallback, useEffect, useState } from 'react';
import { useSession, useStore } from '../lib/store.jsx';
import { t } from '../lib/i18n.js';

const KEY = 'forge:tour';
const PENDING = 'forge:tour-pending';
const listeners = new Set();
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } };
const write = (v) => { try { if (v) localStorage.setItem(KEY, JSON.stringify(v)); else localStorage.removeItem(KEY); } catch { /* ignore */ } listeners.forEach((f) => f()); };
export const queueTour = () => { try { localStorage.setItem(PENDING, '1'); } catch { /* ignore */ } };
const takePending = () => { try { const v = localStorage.getItem(PENDING); localStorage.removeItem(PENDING); return v === '1'; } catch { return false; } };

// sel = co zvýraznit, until = kdy krok přeskočit sám (uživatel udělal, co bublina říká)
const STEPS = [
  { id: 'tick', sel: '.set:not(.is-done) .check', until: () => document.querySelector('.rest-bar') },
  { id: 'goal', sel: '.set:not(.is-done) .set-sub' },
  { id: 'name', sel: '.set:not(.is-done)', pick: (el) => el.closest('.card.ex')?.querySelector('.ex-name') },
  { id: 'replace', sel: '.set:not(.is-done)', pick: (el) => el.closest('.card.ex')?.querySelector('.replace-btn') },
  { id: 'more', sel: '.set:not(.is-done)', pick: (el) => el.closest('.card.ex')?.querySelector('.ex-more') },
  { id: 'finish', sel: '.finish-bottom', until: () => document.querySelector('.summary') },
  { id: 'summary', sel: '.summary .kpis' },
  { id: 'cta', sel: '.sum-cta', last: true },
];

function useTourState() {
  const [s, setS] = useState(read);
  useEffect(() => { const f = () => setS(read()); listeners.add(f); return () => listeners.delete(f); }, []);
  return s;
}

// Rozběhnutý trénink: první dva cviky hotové, třetí rozdělaný, začátek před 32 minutami
export function useStartTour(go) {
  const { templates, startWorkout } = useStore();
  const { patchActive } = useSession();
  return useCallback(() => {
    const tpl = templates.find((x) => x.id === 'push-normal') || templates.find((x) => x.builtin) || templates[0];
    if (!tpl) return false;
    startWorkout(tpl);
    patchActive((a) => ({
      ...a, startedAt: Date.now() - 32 * 60000,
      exercises: a.exercises.map((e, i) => ({
        ...e,
        // první série +2,5 kg → na konci prohlídky je v souhrnu nový rekord
        sets: e.sets.map((s, j) => ({ ...s, done: i < 2 || (i === 2 && j === 0), ...(i === 0 && j === 0 && Number(s.weight) > 0 ? { weight: String(Number(s.weight) + 2.5) } : {}) })),
      })),
    }));
    go('workout');
    write({ step: 0 });
    return true;
  }, [templates, startWorkout, patchActive, go]);
}

export default function Tour({ go }) {
  const { mode, templates, loading } = useStore();
  const state = useTourState();
  const start = useStartTour(go);
  const [rect, setRect] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Vstup do dema z přihlášení → průvodce se spustí sám (jednou)
  useEffect(() => {
    if (mode === 'demo' && !loading && templates.length && takePending()) start();
  }, [mode, loading, templates.length, start]);

  const step = state ? STEPS[state.step] : null;
  const next = useCallback(() => {
    const n = (read()?.step ?? 0) + 1;
    write(n < STEPS.length ? { step: n } : null);
  }, []);
  const stop = useCallback(() => write(null), []);

  // Sledování cíle (DOM se mění – jednoduché dotazování je nejspolehlivější)
  useEffect(() => {
    if (!step) return undefined;
    let scrolled = false;
    const tick = () => {
      if (step.until?.()) return next();
      setDialogOpen(Boolean(document.querySelector('.sheet-backdrop')));
      let el = document.querySelector(step.sel);
      if (el && step.pick) el = step.pick(el);
      if (!el) { setRect(null); return undefined; }
      if (!scrolled) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); scrolled = true; }
      const r = el.getBoundingClientRect();
      setRect((p) => (p && p.top === r.top && p.left === r.left && p.width === r.width && p.height === r.height ? p : { top: r.top, left: r.left, width: r.width, height: r.height }));
      return undefined;
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [step, next]);

  if (!step || mode !== 'demo' || dialogOpen) return null;
  const pad = 6;
  const vh = window.innerHeight, vw = window.innerWidth;
  const below = !rect || rect.top + rect.height / 2 < vh * 0.55;
  const bubbleStyle = rect
    ? below
      ? { top: Math.min(vh - 200, rect.top + rect.height + pad + 12) }
      : { bottom: Math.max(90, vh - rect.top + pad + 12) }
    : { top: '40%' };
  return (
    <div className="tour" aria-live="polite">
      {rect
        ? <div className="tour-hole" style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }} />
        : <div className="tour-dim" />}
      <div className="tour-bubble" role="dialog" aria-label={t('tour.' + step.id)} style={{ ...bubbleStyle, left: 12, right: 12, maxWidth: Math.min(420, vw - 24), marginInline: 'auto' }}>
        <p className="tour-count label">{state.step + 1} / {STEPS.length}</p>
        <h3>{t('tour.' + step.id)}</h3>
        <p className="small">{t('tour.' + step.id + 'Sub')}</p>
        <div className="tour-actions">
          <button className="btn btn-ghost btn-sm" onClick={stop}>{step.last ? t('tour.close') : t('tour.skip')}</button>
          {!step.last && <button className="btn btn-primary btn-sm" onClick={next}>{t('tour.next')}</button>}
        </div>
      </div>
    </div>
  );
}
