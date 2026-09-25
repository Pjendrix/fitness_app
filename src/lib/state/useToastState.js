import { useCallback, useRef, useState } from 'react';
import { t } from '../i18n.js';

// Toast (volitelně s akcí, např. „Zpět“) + továrna na chybové hlášky zápisů
export function useToastState() {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const notify = useCallback((msg, opts = {}) => {
    clearTimeout(timer.current);
    const id = Date.now() + Math.random();
    setToast({ msg, id, action: opts.action || null });
    timer.current = setTimeout(() => setToast((x) => (x?.id === id ? null : x)), opts.duration || (opts.action ? 5000 : 3000));
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);
  const fail = useCallback((key) => (e) => { console.error(e); notify(t(key, { m: e?.code || e?.message || '?' })); }, [notify]);
  return { toast, notify, dismissToast, fail };
}
