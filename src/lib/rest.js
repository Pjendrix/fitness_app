// Pauza mezi sériemi: výchozí délka (s) a krátké pípnutí na konci.
const KEY = 'forge:rest';
export const REST_OPTIONS = [0, 60, 90, 120, 180];
export const getRestDefault = () => {
  try { const v = parseInt(localStorage.getItem(KEY), 10); return REST_OPTIONS.includes(v) ? v : 90; } catch { return 90; }
};
export const setRestDefault = (s) => { try { localStorage.setItem(KEY, String(s)); } catch { /* ignore */ } };

let ctx = null;
// Volat z uživatelského gesta (odškrtnutí série), jinak iOS zvuk nepustí.
export const primeAudio = () => {
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { /* bez zvuku */ }
};
export const beep = () => {
  navigator.vibrate?.([200, 100, 200]);
  if (!ctx) return;
  try {
    [0, 0.22].forEach((at) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + at);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.18);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + at);
      o.stop(ctx.currentTime + at + 0.2);
    });
  } catch { /* ignore */ }
};
