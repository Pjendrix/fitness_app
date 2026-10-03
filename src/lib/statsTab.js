// Která záložka Stats se otevře (Progress | Numbers). Home a další místa ji nastaví před go('stats');
// jinak zůstane naposledy otevřená.
let tab = null;
export const setStatsTab = (v) => { tab = v; };
export const statsTab = (fallback) => tab || fallback;
