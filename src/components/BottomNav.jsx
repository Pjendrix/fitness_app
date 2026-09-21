import { DumbbellIcon, HistoryIcon, HomeIcon, SettingsIcon, TemplatesIcon } from './Icons.jsx';

const TABS = [
  { id: 'home', label: 'Domů', Icon: HomeIcon },
  { id: 'workout', label: 'Trénink', Icon: DumbbellIcon },
  { id: 'history', label: 'Historie', Icon: HistoryIcon },
  { id: 'templates', label: 'Šablony', Icon: TemplatesIcon },
  { id: 'settings', label: 'Nastavení', Icon: SettingsIcon },
];

export default function BottomNav({ tab, go, live }) {
  return (
    <nav className="bottom-nav" aria-label="Hlavní navigace">
      {TABS.map(({ id, label, Icon }) => (
        <button key={id} className={'nav-item' + (tab === id ? ' is-active' : '')} onClick={() => go(id)} aria-current={tab === id ? 'page' : undefined}>
          <span className="nav-icon">
            <Icon />
            {id === 'workout' && live && <i className="live-dot" aria-label="Probíhá trénink" />}
          </span>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
