import { useEffect, useRef } from 'react';
import { useStore } from '../lib/store.jsx';
import { useDialog } from './Dialog.jsx';
import { clearTrial, trialData } from '../lib/backend.js';
import { t } from '../lib/i18n.js';

// Po prvním přihlášení Googlem: na zařízení jsou data z trialu → nabídnout přenos do účtu (jednou).
// Přenese tréninky, vlastní šablony, knihovnu a tělesnou váhu; startovní split se převezme, pokud ho účet ještě nemá.
export default function TrialImport() {
  const { user, mode, loading, needsSetup, chooseStarter, importData, importBody, notify } = useStore();
  const dialog = useDialog();
  const asked = useRef(false);
  useEffect(() => {
    if (mode !== 'firebase' || !user || loading || asked.current) return;
    const d = trialData();
    if (!d || !(d.workouts?.length || d.templates?.length)) return;
    // „Později“ = zeptat se znovu nejdřív za 3 dny
    const laterKey = `forge:trialLater:${user.uid}`;
    try { if (Date.now() - Number(localStorage.getItem(laterKey) || 0) < 3 * 864e5) return; } catch { /* ignore */ }
    asked.current = true;
    (async () => {
      const choice = await dialog.choose({
        title: t('trial.importTitle'),
        message: t('trial.importMsg', { n: d.workouts?.length || 0 }),
        actions: [{ value: 'later', label: t('trial.importLater') }, { value: 'no', label: t('trial.importNo'), danger: true }, { value: 'yes', label: t('trial.importOk'), primary: true }],
      });
      if (choice === 'no') { clearTrial(); return; }
      if (choice !== 'yes') { try { localStorage.setItem(laterKey, String(Date.now())); } catch { /* ignore */ } return; }
      try {
        if (needsSetup && d.profile) chooseStarter(d.profile);
        const r = await importData({ workouts: d.workouts || [], templates: d.templates || [], library: d.library?.list || [] });
        const b = await importBody(d.body || []);
        clearTrial();
        notify(t('trial.imported', { n: r.workouts, b }), { duration: 6000 });
      } catch (e) {
        console.error(e);
        notify(t(e?.message === 'offline' ? 'set.importOffline' : 'trial.importFail'));
        asked.current = false;
      }
    })();
  }, [mode, user, loading, needsSetup, chooseStarter, importData, importBody, notify, dialog]);
  return null;
}
