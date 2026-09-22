import { useRef, useState } from 'react';

// Řádek, který jde smazat potažením doleva (dotyk i myš). Svislé scrollování zůstává funkční.
// Pro klávesnici / čtečky je uvnitř skryté tlačítko „Smazat“, které se ukáže při focusu.
const THRESHOLD = 90;

export default function SwipeRow({ onDelete, deleteLabel, className = '', children }) {
  const [dx, setDx] = useState(0);
  const [anim, setAnim] = useState(false);
  const st = useRef(null);
  const dxRef = useRef(0);
  const swiped = useRef(false);
  const set = (v) => { dxRef.current = v; setDx(v); };

  const reset = () => { setAnim(true); set(0); };
  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    setAnim(false);
    swiped.current = false;
    st.current = { x: e.clientX, y: e.clientY, on: false, dead: false };
  };
  const onPointerMove = (e) => {
    const s = st.current;
    if (!s || s.dead) return;
    const mx = e.clientX - s.x, my = e.clientY - s.y;
    if (!s.on) {
      if (Math.abs(my) > 10 && Math.abs(my) > Math.abs(mx)) { s.dead = true; return; }
      if (mx < -12 && Math.abs(mx) > Math.abs(my) * 1.4) {
        s.on = true;
        swiped.current = true;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        document.activeElement?.blur?.(); // zavřít klávesnici
      } else return;
    }
    set(Math.max(-200, Math.min(0, mx)));
  };
  const end = () => {
    const s = st.current;
    st.current = null;
    if (!s?.on) return;
    setTimeout(() => { swiped.current = false; }, 400);
    setAnim(true);
    if (dxRef.current <= -THRESHOLD) {
      navigator.vibrate?.(15);
      set(-window.innerWidth);
      setTimeout(onDelete, 160);
    } else reset();
  };
  // Klepnutí, které bylo ve skutečnosti swipe, nesmí odškrtnout sérii ani kliknout na +/−
  const onClickCapture = (e) => {
    if (swiped.current) { e.preventDefault(); e.stopPropagation(); swiped.current = false; }
  };

  return (
    <div className={'swipe' + (dx < 0 ? ' is-swiping' : '')}>
      <div className={'swipe-bg' + (dx <= -THRESHOLD ? ' is-armed' : '')} aria-hidden="true">{deleteLabel}</div>
      <div className={'swipe-fg ' + className} style={{ transform: dx ? `translateX(${dx}px)` : undefined, transition: anim ? 'transform 0.18s ease-out' : 'none' }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={end} onPointerCancel={() => { st.current = null; reset(); }}
        onClickCapture={onClickCapture}>
        {children}
        <button type="button" className="sr-only-focusable" onClick={onDelete}>{deleteLabel}</button>
      </div>
    </div>
  );
}
