import { useCallback, useEffect, useMemo, useState } from 'react';
import { bodyEntry, validBody } from '../body.js';

// E3: tělesná váha účtu – živý odběr + zápis (jeden záznam na den, nový zápis téhož dne ho přepíše)
export function useBodyData(api, fail) {
  const [body, setBody] = useState([]); // [{ id: 'YYYY-MM-DD', date, weight }] od nejnovějšího

  useEffect(() => {
    if (!api) { setBody([]); return undefined; }
    let cancelled = false;
    const unsub = api.subscribeBody((list) => { if (!cancelled) setBody(list); }, (e) => { if (!cancelled) fail('err.load')(e); });
    return () => { cancelled = true; unsub(); };
  }, [api, fail]);

  const sortDesc = (list) => [...list].sort((a, b) => b.date - a.date);
  const saveBodyWeight = useCallback((weight, when = Date.now()) => {
    if (!validBody(weight)) return false;
    const e = bodyEntry(when, weight);
    setBody((l) => sortDesc([...l.filter((x) => x.id !== e.id), e]));
    api.saveBody(e).catch(fail('err.save'));
    return true;
  }, [api, fail]);
  const deleteBodyWeight = useCallback((id) => {
    setBody((l) => l.filter((x) => x.id !== id));
    api.deleteBody(id).catch(fail('err.delete'));
  }, [api, fail]);
  // Import ze zálohy: jen dny, které ještě nemají záznam
  const importBody = useCallback(async (list) => {
    const have = new Set(body.map((b) => b.id));
    const fresh = (Array.isArray(list) ? list : [])
      .filter((b) => b && Number.isFinite(b.date) && validBody(b.weight))
      .map((b) => bodyEntry(b.date, b.weight))
      .filter((b) => !have.has(b.id));
    if (!fresh.length) return 0;
    await api.saveBodies(fresh);
    setBody((l) => sortDesc([...l, ...fresh]));
    return fresh.length;
  }, [api, body]);

  return useMemo(() => ({ body, saveBodyWeight, deleteBodyWeight, importBody }), [body, saveBodyWeight, deleteBodyWeight, importBody]);
}
