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
import { useLang } from './lib/i18n.js';
import { syncThemeColor } from './lib/theme.js';
import { useViewMode } from './lib/viewMode.js';
import { applyAppearance } from './lib/appearance.js';
import Tour from './components/Tour.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { initialTab, onTabPop, pushTab, replaceTab } from './lib/nav.js';

// Home a Trénink hned, zbytek líně (menší první načtení)
const History = lazy(() => import('./screens/History.jsx'));
const Templates = lazy(() => import('./screens/Templates.jsx'));
const Settings = lazy(() => import('./screens/Settings.jsx'));
const Analytics = lazy(() => import('./screens/Analytics.jsx'));
const Exercises = lazy(() => import('./screens/Exercises.jsx'));
const MobileStats = lazy(() => import('./screens/MobileStats.jsx'));
// Statistiky: desktop = plná analytika, mobil = zjednodušený přehled (plná verze přes „statsFull“)
function Stats({ go }) {
  const { desktop } = useViewMode();
  return desktop ? <Analytics go={go} /> : <MobileStats go={go} />;
}
const SCREENS = { home: Home, workout: Workout, history: History, templates: Templates, settings: Settings, stats: Stats, statsFull: Analytics, exercises: Exercises };

const Nav = memo(BottomNav);
const Undo = memo(UndoButton);

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
  if (!user) return <><Login /><Toast /></>;

  const Screen = SCREENS[tab];
  return (
    <div className="shell" data-lang={lang}>
      <main className="main">
        <ErrorBoundary key={tab} onHome={tab === 'home' ? null : () => go('home')}>
          <Suspense fallback={<div className="screen"><p className="empty" aria-busy="true">…</p></div>}>
            <Screen go={go} />
          </Suspense>
        </ErrorBoundary>
      </main>
      <DemoBar />
      <SyncBadge />
      <Undo />
      <RestBar />
      <Tour go={go} />
      <Toast />
      <UpdatePrompt />
      <Nav tab={tab} go={go} live={live} />
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
