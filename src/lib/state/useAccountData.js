import { useCallback, useEffect, useState } from 'react';
import { starterConfig, starterId } from '../../data/defaultTemplates.js';
import { EXERCISES } from '../../data/exercises.js';
import { LEGACY_PINK, loadLibrary, MAX_PINS, migratePrs, migrateTemplate } from './model.js';

// Stav účtu ze Firestore: vlastní šablony, rekordy, knihovna, hlavní šablony, vzhled, týdenní cíl, připnuté cviky.
// Odebírá se živě (D1) – cache hned, server a změny z jiných zařízení průběžně.
// B4: když server zápis odmítne, Firestore vrátí svou cache a snapshot sem pošle skutečný stav →
// optimisticky upravené šablony / knihovna / nastavení se samy vrátí (chybu ukáže fail()).
export function useAccountData(api, user, fail) {
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaReady, setMetaReady] = useState(false); // meta načtená pro aktuální účet
  const [custom, setCustom] = useState([]);
  const [prs, setPrs] = useState({});
  const [library, setLibrary] = useState(EXERCISES);
  const [starter, setStarter] = useState(null); // startovní split účtu (ppl / ul / fb)
  const [mainCfg, setMainCfg] = useState(null); // hlavní šablony účtu; null = nový účet → výběr splitu
  const [appearance, setAppearanceState] = useState(null); // {tint, strength, accent}
  const [weeklyGoal, setWeeklyGoalState] = useState(3);
  const [pinnedLifts, setPinnedLifts] = useState([]);

  useEffect(() => {
    if (!api) return undefined;
    let cancelled = false, first = true;
    setMetaLoading(true);
    setMetaReady(false);
    const unsub = api.subscribeMeta((d, meta) => {
      if (cancelled) return;
      const canMigrate = !meta.fromCache; // migrační zápisy jen nad daty ze serveru, ne nad (možná neúplnou) cache
      // Zachovat pořadí na obrazovce (snapshot chodí seřazený podle id) – uložená šablona neposkočí jinam
      setCustom((prev) => {
        const pos = new Map(prev.map((x, i) => [x.id, i]));
        return d.templates.map(migrateTemplate).sort((x, y) => (pos.get(x.id) ?? 1e9) - (pos.get(y.id) ?? 1e9));
      });
      setPrs(migratePrs(d.prs));
      setLibrary(loadLibrary(d.library));
      // Migrace z pevných profilů (krystof/chiara) na vlastní konfiguraci účtu – nic se nemaže
      const sid = starterId(d.profile);
      let cfg = d.main?.own || null;
      if (!cfg && sid) {
        cfg = (d.profile && d.main?.[d.profile]) || starterConfig(sid);
        if (canMigrate) {
          api.saveMain(cfg).catch((e) => console.warn('migrate main', e));
          if (sid !== d.profile) api.saveProfile(sid).catch((e) => console.warn('migrate profile', e));
        }
      }
      setStarter(sid);
      setMainCfg(cfg);
      let look = d.settings?.appearance || null;
      if (!look && d.profile === 'chiara') {
        look = LEGACY_PINK; // Chiara si nechá růžové podbarvení
        if (canMigrate) api.saveSettings({ appearance: look }).catch((e) => console.warn('migrate appearance', e));
      }
      setAppearanceState(look);
      const cached = parseInt(localStorage.getItem(`forge:goal:${user.uid}`), 10);
      setWeeklyGoalState(d.settings?.weeklyGoal || cached || 3);
      let pins = d.settings?.pinnedLifts;
      if (!Array.isArray(pins)) { try { pins = JSON.parse(localStorage.getItem(`forge:pins:${user.uid}`)); } catch { pins = null; } }
      setPinnedLifts(Array.isArray(pins) ? pins.filter((k) => typeof k === 'string').slice(0, MAX_PINS) : []);
      if (first) { first = false; setMetaReady(true); setMetaLoading(false); }
    }, (e) => { if (cancelled) return; fail('err.load')(e); setMetaLoading(false); });
    return () => { cancelled = true; unsub(); };
  }, [api, fail]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetAccount = useCallback(() => {
    setCustom([]); setPrs({}); setLibrary(EXERCISES); setStarter(null); setMainCfg(null); setAppearanceState(null); setPinnedLifts([]);
  }, []);

  return {
    metaLoading, metaReady, custom, setCustom, prs, setPrs, library, setLibrary, starter, setStarter, mainCfg, setMainCfg,
    appearance, setAppearanceState, weeklyGoal, setWeeklyGoalState, pinnedLifts, setPinnedLifts, resetAccount,
  };
}
