import { useEffect, useRef } from 'react';
import { useBackClose } from '../lib/nav.js';

// Spodní panel / modál: aria-modal, zavření Esc a klepnutím mimo, focus trap, zámek scrollu, návrat focusu.
const stack = [];
const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Sheet({ label, onClose, className = '', children }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useBackClose(() => closeRef.current?.()); // systémové Zpět zavře panel (C5)

  useEffect(() => {
    const id = {};
    stack.push(id);
    const el = ref.current;
    const prevFocus = document.activeElement;
    const focusables = () => [...el.querySelectorAll(FOCUSABLE)];
    if (!el.contains(document.activeElement)) (el.querySelector('[data-autofocus]') || el).focus({ preventScroll: true });
    const onKey = (e) => {
      if (stack[stack.length - 1] !== id) return;
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current?.(); return; }
      if (e.key !== 'Tab') return;
      const f = focusables();
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === el)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    const body = document.body;
    const prevOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      stack.splice(stack.indexOf(id), 1);
      body.style.overflow = prevOverflow;
      if (prevFocus && document.contains(prevFocus)) prevFocus.focus?.({ preventScroll: true });
    };
  }, []);

  return (
    <div className="sheet-backdrop" onClick={() => closeRef.current?.()}>
      <div ref={ref} tabIndex={-1} className={'sheet ' + className} role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}
