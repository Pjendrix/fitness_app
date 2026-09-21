import { useState } from 'react';
import { StoreProvider, useStore } from './lib/store.jsx';
import BottomNav from './components/BottomNav.jsx';
import Login from './screens/Login.jsx';
import Home from './screens/Home.jsx';
import Workout from './screens/Workout.jsx';
import History from './screens/History.jsx';
import Templates from './screens/Templates.jsx';
import Settings from './screens/Settings.jsx';

const SCREENS = { home: Home, workout: Workout, history: History, templates: Templates, settings: Settings };

function Shell() {
  const { user, active, toast } = useStore();
  const [tab, setTab] = useState('home');

  if (user === undefined) return <div className="splash" aria-busy="true">Forge</div>;
  if (!user) return <Login />;

  const Screen = SCREENS[tab];
  const go = (t) => {
    setTab(t);
    window.scrollTo({ top: 0 });
  };
  return (
    <>
      <Screen go={go} />
      {toast && <div className="toast" role="status" key={toast.id}>{toast.msg}</div>}
      <BottomNav tab={tab} go={go} live={Boolean(active)} />
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <div className="orb orb-a" aria-hidden="true" />
      <div className="orb orb-b" aria-hidden="true" />
      <Shell />
    </StoreProvider>
  );
}
