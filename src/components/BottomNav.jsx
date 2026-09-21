import ViewToggle from './ViewToggle.jsx';
import { ChartIcon, DumbbellIcon, HistoryIcon, HomeIcon, SettingsIcon, TemplatesIcon } from './Icons.jsx';

// Mobil: spodní lišta s 5 záložkami. Desktop (≥ 960 px): boční panel + Statistiky jako samostatná položka.
const TABS = [
  { id: 'home', label: 'Domů', Icon: HomeIcon },
  { id: 'workout', label: 'Trénink', Icon: DumbbellIcon },
  { id: 'history', label: 'Historie', Icon: HistoryIcon },
  { id: 'stats', label: 'Statistiky', Icon: ChartIcon, desktop: true },
  { id: 'templates', label: 'Šablony', Icon: TemplatesIcon },
  { id: 'settings', label: 'Nastavení', Icon: SettingsIcon },
];

export default function BottomNav({ tab, go, live }) {
  const current = (id) => tab === id || (id === 'history' && tab === 'stats');
  return (
    <nav className="nav" aria-label="Hlavní navigace">
      <div className="nav-brand"><span className="brand-mark">▮▮</span> Forge</div>
      {TABS.map(({ id, label, Icon, desktop }) => (
        <button key={id} className={'nav-item' + (desktop ? ' desktop-only' : '') + (current(id) ? ' is-mobile-active' : '') + (tab === id ? ' is-active' : '')} onClick={() => go(id)} aria-current={tab === id ? 'page' : undefined}>
          <span className="nav-icon">
            <Icon />
            {id === 'workout' && live && <i className="live-dot" aria-label="Probíhá trénink" />}
          </span>
          <span>{label}</span>
        </button>
      ))}
      <div className="nav-foot"><ViewToggle /></div>
    </nav>
  );
}
