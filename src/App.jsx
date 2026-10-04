import { lazy, memo, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { StoreProvider, useStore } from './lib/store.jsx';
import { DialogProvider } from './components/Dialog.jsx';
import BottomNav from './components/BottomNav.jsx';
import UndoButton from './components/UndoButton.jsx';
import Toast from './components/Toast.jsx';
import RestBar from './components/RestBar.jsx';
import SyncBadge from './components/SyncBadge.jsx';
import UpdatePrompt from './components/UpdatePrompt.jsx';
import DemoBar from './components/DemoBar.jsx';
import Login from './screens/Login.jsx';
import Home from './screens/Home.jsx';
import Workout from './screens/Workout.jsx';
import { t, useLang } from './lib/i18n.js';
import { setStatsTab, statsTab } from './lib/statsTab.js';
import { syncThemeColor } from './lib/theme.js';
import { useViewMode } from './lib/viewMode.js';
import { applyAppearance } from './lib/appearance.js';
import Tour from './components/Tour.jsx';
import TrialImport from './components/TrialImport.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { initialTab, onTabPop, pushTab, replaceTab } from './lib/nav.js';

// Home a Trénink hned, zbytek líně (menší první načtení)
const History = lazy(() => import('./screens/History.jsx'));
const Templates = lazy(() => import('./screens/Templates.jsx'));
const Settings = lazy(() => import('./screens/Settings.jsx'));
const Analytics = lazy(() => import('./screens/Analytics.jsx'));
const Exercises = lazy(() => import('./screens/Exercises.jsx'));
const MobileStats = lazy(() => import('./screens/MobileStats.jsx'));
const Progress = lazy(() => import('./screens/Progress.jsx'));
const Why = lazy(() => import('./screens/Why.jsx'));
// Statistiky: desktop = plná analytika, mobil = zjednodušený přehled (plná verze přes „statsFull“)
// Forge Heat: záložky Progress | Numbers (jen když je gamifikace zapnutá; jinak rovnou čísla)
function Stats({ go }) {
  const { desktop } = useViewMode();
  const { gamify } = useStore();
  const [tab, setTab] = useState(() => statsTab('progress')); // Stats je teď záložka – motivační přehled jako první
  const pick = (v) => { setStatsTab(v); setTab(v); window.scrollTo({ top: 0 }); };
  const cur = gamify ? tab : 'numbers';
  const tabs = gamify ? (
    <div className="seg stats-tabs" role="tablist" aria-label={t('stats.tabs')}>
      {['progress', 'numbers'].map((v) => <button key={v} role="tab" aria-selected={cur === v} className={cur === v ? 'is-on' : ''} onClick={() => pick(v)}>{t('stats.' + v)}</button>)}
    </div>
  ) : null;
  if (cur === 'progress') return <Progress go={go} tabs={tabs} />;
  return desktop ? <Analytics go={go} tabs={tabs} /> : <MobileStats go={go} tabs={tabs} />;
}
const SCREENS = { home: Home, workout: Workout, history: History, templates: Templates, settings: Settings, stats: Stats, statsFull: Analytics, exercises: Exercises, why: Why };

const Nav = memo(BottomNav);
const Undo = memo(UndoButton);

// Verze appky nenápadně na konci každé obrazovky (5.3.0 → „v5.3“)
export const APP_VERSION = String(import.meta.env.APP_VERSION || '').replace(/\.0$/, '');
function AppVersion({ className = 'app-version' }) {
  return APP_VERSION ? <p className={className} aria-label={`Forge ${APP_VERSION}`}>v{APP_VERSION}</p> : null;
}

function Shell() {
  const { user, live, appearance } = useStore();
  // Vzhled účtu (podbarvení + akcent) → CSS proměnné na <html>
  useEffect(() => {
    applyAppearance(user ? appearance : null);
    syncThemeColor();
  }, [user, appearance]);
  const { lang } = useLang(); // překreslit při změně jazyka
  const [tab, setTab] = useState(initialTab);
  const tabRef = useRef(tab);
  tabRef.current = tab;
  // C2: pozice scrollu pro každou záložku (návrat z Historie do rozcvičeného tréninku na stejné místo)
  const scrolls = useRef({});
  const switchTab = useCallback((t) => {
    scrolls.current[tabRef.current] = window.scrollY;
    setTab(t);
  }, []);
  const go = useCallback((t) => {
    if (t === tabRef.current) { // klepnutí na aktuální záložku = nahoru
      scrolls.current[t] = 0;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    pushTab(t);
    switchTab(t);
  }, [switchTab]);
  useEffect(() => { replaceTab(tabRef.current); }, []);
  useEffect(() => onTabPop(switchTab), [switchTab]); // systémové Zpět mezi obrazovkami (C5)
  useLayoutEffect(() => {
    const y = scrolls.current[tab] || 0;
    window.scrollTo(0, y);
    if (y) requestAnimationFrame(() => window.scrollTo(0, y)); // líně načtená obrazovka mohla být ještě nízká
  }, [tab]);
  // Nový trénink začíná nahoře, ne na pozici minulého
  useEffect(() => { if (!live) scrolls.current.workout = 0; }, [live]);
  // Rozdělaný trénink po znovuotevření appky (iOS/Android ji v pozadí zavřou) → rovnou na Trénink, ne na Domů
  const resumed = useRef(false);
  useEffect(() => { resumed.current = false; }, [user?.uid]);
  useEffect(() => {
    if (live && !resumed.current) { resumed.current = true; if (tabRef.current !== 'workout') go('workout'); }
  }, [live, go]);

  if (user === undefined) return <div className="splash" aria-busy="true">Forge</div>;
  if (!user) return <><Login /><AppVersion className="app-version is-login" /><Toast /></>;

  const Screen = SCREENS[tab];
  return (
    <div className="shell" data-lang={lang}>
      <main className="main">
        <ErrorBoundary key={tab} onHome={tab === 'home' ? null : () => go('home')}>
          <Suspense fallback={<div className="screen"><p className="empty" aria-busy="true">…</p></div>}>
            <Screen go={go} />
          </Suspense>
        </ErrorBoundary>
        <AppVersion />
      </main>
      <DemoBar />
      <SyncBadge />
      <Undo lang={lang} />
      <RestBar />
      <Tour go={go} />
      <TrialImport />
      <Toast />
      <UpdatePrompt />
      {/* lang: memo komponenty se jinak po přepnutí jazyka nepřekreslí */}
      <Nav tab={tab} go={go} live={live} lang={lang} />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <DialogProvider>
          <Shell />
        </DialogProvider>
      </StoreProvider>
    </ErrorBoundary>
  );
}
