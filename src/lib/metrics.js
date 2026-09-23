// Globální metriky tréninku (ne po cvicích): cviky, série, objem, délka, hustota, intenzita, skóre.
// Intenzita = průměrná váha série jako % nejlepšího odhadovaného 1RM daného cviku z PŘEDCHOZÍCH tréninků.
// Série cviku bez historie (první trénink) a série bez váhy se do intenzity nepočítají.

export const e1rm = (w, r) => (r <= 1 ? w : w * (1 + r / 30)); // Epley

// workouts v libovolném pořadí → Map(id → metrics)
export function computeMetrics(workouts) {
  const out = new Map();
  const best = new Map(); // exKey → nejlepší e1RM zatím
  for (const w of [...workouts].sort((a, b) => a.startedAt - b.startedAt)) {
    let sets = 0, volume = 0, pctSum = 0, pctN = 0;
    const ex = new Set();
    const updates = [];
    for (const e of w.exercises) {
      if (!e.sets.length) continue;
      ex.add(e.key);
      const timed = e.type === 'time';
      const prior = best.get(e.key);
      for (const s of e.sets) {
        sets++;
        if (timed || !(s.weight > 0) || !(s.reps > 0)) continue;
        volume += s.weight * s.reps;
        if (prior) { pctSum += Math.min(1.2, s.weight / prior); pctN++; }
        updates.push([e.key, e1rm(s.weight, s.reps)]);
      }
    }
    for (const [k, v] of updates) if (!(best.get(k) >= v)) best.set(k, v);
    const minutes = Math.max(0, (w.finishedAt - w.startedAt) / 60000);
    const intensity = pctN ? (pctSum / pctN) * 100 : null;
    out.set(w.id, {
      id: w.id, name: w.name, templateId: w.templateId, startedAt: w.startedAt,
      exercises: ex.size, sets, volume, minutes,
      density: minutes >= 5 ? volume / minutes : null,
      intensity,
      score: intensity != null ? (sets * intensity) / 10 : null,
    });
  }
  return out;
}

// Předchozí trénink ze stejné šablony (nebo se stejným názvem u prázdných tréninků)
export function previousSame(w, workouts) {
  let prev = null;
  for (const x of workouts) {
    if (x.id === w.id || x.startedAt >= w.startedAt) continue;
    const same = w.templateId ? x.templateId === w.templateId : x.name === w.name;
    if (same && (!prev || x.startedAt > prev.startedAt)) prev = x;
  }
  return prev;
}
