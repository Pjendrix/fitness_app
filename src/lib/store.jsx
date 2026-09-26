// Store = skládačka hooků ze src/lib/state/. Obrazovky používají jen useStore / useSession / useToast.
//   useAccountData      stav účtu ze Firestore (šablony, rekordy, knihovna, nastavení) – živě
//   useHistoryData      historie tréninků – živě + srovnání rekordů
//   useUndo             Zpět / Znovu
//   useAccountActions   šablony, knihovna, vzhled, cíle
//   useHistoryActions   úprava / mazání / import tréninků
//   useActiveWorkout    rozdělaný trénink, draft, pauza
//   useRenameExercise   přejmenování / sloučení cviku napříč historií (A3)
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { backend } from './backend.js';
import { useToastState } from './state/useToastState.js';
import { useAccountData } from './state/useAccountData.js';
import { useHistoryData, useRecordsReconcile } from './state/useHistoryData.js';
import { useUndo } from './state/useUndo.js';
import { useAccountActions } from './state/useAccountActions.js';
import { useHistoryActions } from './state/useHistoryActions.js';
import { useActiveWorkout } from './state/useActiveWorkout.js';
import { useRenameExercise } from './state/useRenameExercise.js';

// Tři oddělené kontexty: psaní v aktivním tréninku nepřekresluje zbytek appky.
const DataCtx = createContext(null);
const SessionCtx = createContext(null);
const ToastCtx = createContext(null);
export const useStore = () => useContext(DataCtx);
export const useSession = () => useContext(SessionCtx);
export const useToast = () => useContext(ToastCtx);

export function StoreProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = načítání, null = odhlášen
  const [denied, setDenied] = useState(null); // e-mail účtu bez přístupu
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const api = useMemo(() => (user ? backend.data(user.uid) : null), [user]);
  const { toast, notify, dismissToast, fail } = useToastState();

  // ——— Auth a připojení ———
  useEffect(() => backend.onAuth((u) => { setUser(u); if (u) setDenied(null); }, setDenied), []);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // ——— Data ———
  const acc = useAccountData(api, user, fail);
  const { workouts, setWorkouts, workoutsReady, sync, resetHistory } = useHistoryData(api, fail);
  const { prs, setPrs, library, setLibrary, setCustom, setMainCfg, metaLoading, metaReady } = acc;
  useRecordsReconcile({ api, fail, prs, setPrs, workouts, workoutsReady, sync, metaLoading });

  const undoState = useMemo(() => ({ custom: acc.custom, library, mainCfg: acc.mainCfg, workouts, prs }), [acc.custom, library, acc.mainCfg, workouts, prs]);
  const undoSetters = useMemo(() => ({ setCustom, setLibrary, setMainCfg, setPrs, setWorkouts }), [setCustom, setLibrary, setMainCfg, setPrs, setWorkouts]);
  const { undoStack, redoStack, remember, undo, redo, resetUndo } = useUndo({ api, fail, notify, state: undoState, setters: undoSetters });

  const account = useAccountActions({ api, fail, notify, remember, user, acc, workouts });
  const history = useHistoryActions({ api, fail, remember, workouts, setWorkouts, prs, setPrs, library, setLibrary, setCustom });
  const session = useActiveWorkout({
    user, api, notify, prs, setPrs, workouts, setWorkouts, typeOf: account.typeOf, templates: account.templates,
    saveMainTemplate: account.saveMainTemplate, saveTemplate: account.saveTemplate,
  });
  const { detachDraft, resetSession } = session;
  const { renamePreview, renameExercise } = useRenameExercise({
    api, fail, remember, user, acc, workouts, setWorkouts, typeOf: account.typeOf, catOf: account.catOf, patchActive: session.patchActive,
  });
  const { resetAccount } = acc;

  const signIn = useCallback(() => { setDenied(null); return backend.signIn().catch(fail('err.login')); }, [fail]);
  const signOut = useCallback(async () => {
    detachDraft(); // draft zůstane uložený pro svého majitele
    await backend.signOut();
    resetSession(); resetAccount(); resetHistory(); resetUndo();
  }, [detachDraft, resetSession, resetAccount, resetHistory, resetUndo]);
  // F2: smazání účtu i všech dat. Při zrušení ověření (popup) vyhodí chybu a nic se nezmění.
  const deleteAccount = useCallback(async () => {
    const uid = user?.uid;
    const r = await backend.deleteAccount();
    detachDraft();
    try { localStorage.removeItem(`forge:active:${uid}`); } catch { /* ignore */ }
    resetSession(); resetAccount(); resetHistory(); resetUndo();
    return r;
  }, [user?.uid, detachDraft, resetSession, resetAccount, resetHistory, resetUndo]);
  const startDemo = useCallback(() => backend.startDemo(), []);
  const resetDemo = useCallback(() => { backend.resetDemo(); window.location.reload(); }, []);

  const live = Boolean(session.active);
  const loading = metaLoading || (Boolean(user) && !workoutsReady);
  const needsSetup = Boolean(user) && metaReady && !acc.mainCfg;

  const data = useMemo(() => ({
    user, denied, loading, mode: backend.mode, signIn, signOut, deleteAccount, startDemo, resetDemo, live, sync, online,
    workouts, prs, library, starter: acc.starter, needsSetup, appearance: acc.appearance, weeklyGoal: acc.weeklyGoal, pinnedLifts: acc.pinnedLifts,
    ...account, ...history, startWorkout: session.startWorkout, startEmptyWorkout: session.startEmptyWorkout, syncTemplate: session.syncTemplate,
    undoStack, undo, redoStack, redo, notify, renamePreview, renameExercise,
  }), [user, denied, loading, signIn, signOut, deleteAccount, startDemo, resetDemo, live, sync, online, workouts, prs, library, acc.starter, needsSetup,
    acc.appearance, acc.weeklyGoal, acc.pinnedLifts, account, history, session.startWorkout, session.startEmptyWorkout, session.syncTemplate,
    undoStack, undo, redoStack, redo, notify, renamePreview, renameExercise]);

  const sessionValue = useMemo(() => ({
    active: session.active, patchActive: session.patchActive, finishWorkout: session.finishWorkout, discardWorkout: session.discardWorkout,
    addExerciseToActive: session.addExerciseToActive, replaceExerciseInActive: session.replaceExerciseInActive, prs, notify,
    rest: session.rest, startRest: session.startRest, adjustRest: session.adjustRest, stopRest: session.stopRest,
  }), [session.active, session.patchActive, session.finishWorkout, session.discardWorkout, session.addExerciseToActive, session.replaceExerciseInActive,
    prs, notify, session.rest, session.startRest, session.adjustRest, session.stopRest]);

  const toastValue = useMemo(() => ({ toast, notify, dismissToast }), [toast, notify, dismissToast]);

  return (
    <DataCtx.Provider value={data}>
      <SessionCtx.Provider value={sessionValue}>
        <ToastCtx.Provider value={toastValue}>{children}</ToastCtx.Provider>
      </SessionCtx.Provider>
    </DataCtx.Provider>
  );
}
