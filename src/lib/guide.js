// O4: krátký průvodce prvním spuštěním (3 kroky). Stav jen v tomto prohlížeči.
const KEY = 'forge:guide';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const write = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* ignore */ } };

export const markGuide = (step) => { const g = read(); if (!g[step]) write({ ...g, [step]: true }); };
export const hideGuide = () => write({ ...read(), hidden: true });
export const guideState = () => {
  const g = read();
  const done = Boolean(g.start && g.set && g.stats);
  return { ...g, show: !g.hidden && !done };
};
