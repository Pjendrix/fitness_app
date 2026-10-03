// Log chyb do Firestore (errors/{auto}), aby admin viděl pády i z cizích telefonů. Jen přihlášený účet
// (ne demo / trial), max. 5 záznamů za relaci, stejná chyba jen jednou. Nikdy nesmí shodit appku sama.
import { backend } from './backend.js';

const seen = new Set();
let sent = 0;
const VER = String(import.meta.env.APP_VERSION || '');

export function logError(err, where = 'app') {
  try {
    const api = backend.errors;
    if (!api || sent >= 5) return;
    const msg = String(err?.message || err || 'unknown').slice(0, 500);
    const key = where + '|' + msg;
    if (seen.has(key)) return;
    seen.add(key);
    sent++;
    api.add({
      msg, where: String(where).slice(0, 80), ver: VER.slice(0, 20), at: Date.now(),
      ...(err?.stack ? { stack: String(err.stack).slice(0, 4000) } : {}),
      ua: String(navigator.userAgent || '').slice(0, 300),
    }).catch(() => {});
  } catch { /* log chyb nesmí nic rozbít */ }
}

// Globální zachytávání: neošetřené výjimky a odmítnuté promisy (chunky po nasazení, síť…)
export function installErrorLog() {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', (e) => logError(e.error || e.message, 'window'));
  window.addEventListener('unhandledrejection', (e) => logError(e.reason, 'promise'));
}
