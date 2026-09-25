import { useCallback, useMemo, useRef } from 'react';
import { starterConfig, starterId } from '../../data/defaultTemplates.js';
import { defaultTypeOf, EXERCISES } from '../../data/exercises.js';
import { INFO_KEYS } from '../../data/infoKeys.js';
import { exKey, LIMITS, sanitizeName } from '../util.js';
import { defaultStep, learnedSteps } from '../progress.js';
import { t } from '../i18n.js';
import { MAX_PINS, migrateTemplate, toLibEntry } from './model.js';

const cleanMainTpl = (x) => { const { builtin: _b, ...rest } = x; return rest; };

// Akce nad účtem: hlavní a vlastní šablony, knihovna cviků, vzhled, týdenní cíl, připnuté cviky + vyhledávání v knihovně.
// Zápisy do Firestore jsou vždy MIMO updater setState (B2) – updater může React spustit víckrát.
export function useAccountActions({ api, fail, notify, remember, user, acc, workouts }) {
  const {
    custom, setCustom, library, setLibrary, mainCfg, setMainCfg, setStarter, appearance, setAppearanceState,
    setWeeklyGoalState, pinnedLifts, setPinnedLifts,
  } = acc;

  // ——— Hlavní šablony (vlastní konfigurace účtu) ———
  const main = useMemo(() => {
    const groups = mainCfg?.groups || [];
    const list = (mainCfg?.templates || []).map((x) => ({ ...migrateTemplate(x), builtin: true }));
    const label = (id) => groups.find((g) => g.id === id)?.label || id;
    return { groups, templates: list.map((x) => ({ ...x, name: `${label(x.group)} ${x.variant || ''}`.trim() })) };
  }, [mainCfg]);
  const templates = useMemo(() => [...main.templates, ...custom], [main, custom]);

  const writeMain = useCallback((cfg) => {
    setMainCfg(cfg);
    api.saveMain(cfg).catch(fail('err.save'));
  }, [api, fail, setMainCfg]);
  const saveMainTemplate = useCallback((tpl) => {
    remember('undo.tpl');
    const list = main.templates.some((x) => x.id === tpl.id) ? main.templates.map((x) => (x.id === tpl.id ? tpl : x)) : [...main.templates, tpl];
    writeMain({ groups: main.groups, templates: list.map(cleanMainTpl) });
  }, [main, writeMain, remember]);
  const deleteMainTemplate = useCallback((id) => {
    remember('undo.tplDel');
    writeMain({ groups: main.groups, templates: main.templates.filter((x) => x.id !== id).map(cleanMainTpl) });
  }, [main, writeMain, remember]);
  const renameGroup = useCallback((id, label, sub) => {
    remember('undo.group');
    writeMain({ groups: main.groups.map((g) => (g.id === id ? { ...g, label: sanitizeName(label, 20), sub: sanitizeName(sub) } : g)), templates: main.templates.map(cleanMainTpl) });
  }, [main, writeMain, remember]);
  // Hlavní šablony ze startovního splitu (první výběr nového účtu i „obnovit šablony“)
  const chooseStarter = useCallback((id) => {
    const sid = starterId(id) || 'ppl';
    if (mainCfg) remember('undo.reset');
    writeMain(starterConfig(sid));
    setStarter(sid);
    api.saveProfile(sid).catch(fail('err.save'));
  }, [api, fail, mainCfg, remember, writeMain, setStarter]);
  const groupLabel = useCallback((id) => main.groups.find((g) => g.id === id)?.label || id, [main]);
  const groupSub = useCallback((id) => main.groups.find((x) => x.id === id)?.sub || t('groups.' + id), [main]);

  // ——— Vlastní šablony ———
  const saveTemplate = useCallback((tpl) => {
    remember('undo.tpl');
    setCustom((c) => [...c.filter((x) => x.id !== tpl.id), tpl]);
    api.saveTemplate(tpl).catch(fail('err.save'));
  }, [api, fail, remember, setCustom]);
  const deleteTemplate = useCallback((id) => {
    remember('undo.tplDel');
    setCustom((c) => c.filter((x) => x.id !== id));
    api.deleteTemplate(id).catch(fail('err.delete'));
  }, [api, fail, remember, setCustom]);

  // ——— Vzhled, týdenní cíl, připnuté cviky ———
  const lookRef = useRef(appearance);
  lookRef.current = appearance;
  const setAppearance = useCallback((patch) => {
    const next = { tint: null, strength: 50, accent: null, ...(lookRef.current || {}), ...patch };
    lookRef.current = next; // rychlé po sobě jdoucí změny (posuvník) navazují na sebe
    setAppearanceState(next);
    api?.saveSettings({ appearance: next }).catch((e) => console.warn('settings', e));
  }, [api, setAppearanceState]);
  // Týdenní cíl: účet (meta/settings) + lokální kopie, kdyby zápis selhal (např. starší rules)
  const setWeeklyGoal = useCallback((n) => {
    const v = Math.min(7, Math.max(1, Math.round(n)));
    setWeeklyGoalState(v);
    try { localStorage.setItem(`forge:goal:${user?.uid}`, String(v)); } catch { /* ignore */ }
    api?.saveSettings({ weeklyGoal: v }).catch((e) => console.warn('settings', e));
  }, [api, user?.uid, setWeeklyGoalState]);
  // Připnuté „Key lifts“ v mobilních statistikách (max 5); účet + lokální kopie jako u týdenního cíle
  const togglePin = useCallback((key) => {
    const has = pinnedLifts.includes(key);
    if (!has && pinnedLifts.length >= MAX_PINS) { notify(t('ms.pinMax', { n: MAX_PINS })); return false; }
    const next = has ? pinnedLifts.filter((k) => k !== key) : [...pinnedLifts, key];
    setPinnedLifts(next);
    try { localStorage.setItem(`forge:pins:${user?.uid}`, JSON.stringify(next)); } catch { /* ignore */ }
    api?.saveSettings({ pinnedLifts: next }).catch((e) => console.warn('settings', e));
    return true;
  }, [pinnedLifts, api, user?.uid, notify, setPinnedLifts]);

  // ——— Knihovna: vyhledávání ———
  const libMap = useMemo(() => new Map(library.map((e) => [exKey(e.name), e])), [library]);
  const typeOf = useCallback((name) => libMap.get(exKey(name))?.type || defaultTypeOf(name), [libMap]);
  const catOf = useCallback((name) => libMap.get(exKey(name))?.cat || null, [libMap]);
  // Krok váhy: ručně v knihovně → naučený z historie → podle vybavení v názvu
  const learned = useMemo(() => learnedSteps(workouts), [workouts]);
  const stepOf = useCallback((name) => {
    const k = exKey(name);
    const manual = libMap.get(k)?.step;
    if (manual) return manual;
    // Naučený krok jen pokud dává smysl pro vybavení (nejmenší rozdíl 1 kg u stroje po 5 kg je spíš překlep)
    const d = defaultStep(name), l = learned.get(k);
    return l && l >= d / 2 ? l : d;
  }, [libMap, learned]);
  const stepIsManual = useCallback((name) => Boolean(libMap.get(exKey(name))?.step), [libMap]);
  const infoOf = useCallback((name) => {
    const k = exKey(name);
    const e = libMap.get(k);
    if (e?.db) return { db: e.db };
    return INFO_KEYS.has(k) ? { curated: true } : null;
  }, [libMap]);

  // ——— Knihovna: zápisy ———
  const libRef = useRef(library);
  libRef.current = library;
  const writeLibrary = useCallback((next) => {
    libRef.current = next;
    setLibrary(next);
    api.saveExercises(next).catch(fail('err.save'));
  }, [api, fail, setLibrary]);
  const saveLibrary = useCallback((list) => {
    remember('undo.library');
    writeLibrary(list.map(toLibEntry).filter((e) => e.name).slice(0, LIMITS.library));
  }, [remember, writeLibrary]);
  const addToLibrary = useCallback((ex) => {
    const entry = toLibEntry(ex);
    if (!entry.name) return;
    remember('undo.library');
    const k = exKey(entry.name);
    writeLibrary([...libRef.current.filter((x) => exKey(x.name) !== k), entry].slice(0, LIMITS.library));
  }, [remember, writeLibrary]);
  const resetLibrary = useCallback(() => saveLibrary(EXERCISES), [saveLibrary]);
  // Ruční krok váhy cviku (null = zase automaticky)
  const setStep = useCallback((name, step) => {
    const k = exKey(name);
    const lib = libRef.current;
    const cur = lib.find((x) => exKey(x.name) === k) || { name, cat: catOf(name) || 'other', ...(typeOf(name) === 'time' ? { type: 'time' } : {}) };
    const { step: _old, ...rest } = cur;
    const entry = toLibEntry(step ? { ...rest, step } : rest);
    writeLibrary([...lib.filter((x) => exKey(x.name) !== k), entry].slice(0, LIMITS.library));
  }, [catOf, typeOf, writeLibrary]);

  // Stabilní objekt: jinak by se kontext s daty přepočítal při každém úhozu v tréninku
  return useMemo(() => ({
    main, templates, groupLabel, groupSub, saveMainTemplate, deleteMainTemplate, renameGroup, chooseStarter,
    saveTemplate, deleteTemplate, setAppearance, setWeeklyGoal, togglePin,
    typeOf, catOf, stepOf, stepIsManual, infoOf, saveLibrary, addToLibrary, resetLibrary, setStep,
  }), [main, templates, groupLabel, groupSub, saveMainTemplate, deleteMainTemplate, renameGroup, chooseStarter,
    saveTemplate, deleteTemplate, setAppearance, setWeeklyGoal, togglePin,
    typeOf, catOf, stepOf, stepIsManual, infoOf, saveLibrary, addToLibrary, resetLibrary, setStep]);
}
