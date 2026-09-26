// D4: sdílené výpočty nad celou historií. Klíčem je samotné pole tréninků ze store – dokud se historie
// nezmění, Historie, souhrn tréninku i Analytika dostanou stejný výsledek bez nového přepočtu.
import { computeMetrics } from './metrics.js';
import { recordsTimeline } from './progress.js';

const memo = (fn) => {
  const cache = new WeakMap();
  return (workouts) => {
    let v = cache.get(workouts);
    if (v === undefined) { v = fn(workouts); cache.set(workouts, v); }
    return v;
  };
};

export const metricsOf = memo(computeMetrics); // Map(id → metriky tréninku)
export const recordsOf = memo(recordsTimeline); // Map(id → rekordy překonané v tréninku)
