import ViewToggle from './ViewToggle.jsx';
import ProfileBadge from './ProfileBadge.jsx';
import { ChartIcon, DumbbellIcon, HistoryIcon, HomeIcon, ListIcon, SettingsIcon, TemplatesIcon } from './Icons.jsx';
import { t } from '../lib/i18n.js';

// Mobile: bottom bar with 5 tabs. Desktop: sidebar incl. Analytics and Exercises.
const TABS = [
  { id: 'home', Icon: HomeIcon },
  { id: 'workout', Icon: DumbbellIcon },
  { id: 'history', Icon: HistoryIcon },
  { id: 'stats', Icon: ChartIcon, desktop: true },
  { id: 'templates', Icon: TemplatesIcon },
  { id: 'exercises', Icon: ListIcon, desktop: true },
  { id: 'settings', Icon: SettingsIcon },
];
const PARENT = { stats: 'history', exercises: 'settings' };

export default function BottomNav({ tab, go, live }) {
  const current = (id) => tab === id || PARENT[tab] === id;
  return (
    <nav className="nav" aria-label={t('nav.main')}>
      <div className="nav-brand"><span className="brand-mark">▮▮</span> Forge <ProfileBadge /></div>
      {TABS.map(({ id, Icon, desktop }) => (
        <button key={id} className={'nav-item' + (desktop ? ' desktop-only' : '') + (current(id) ? ' is-mobile-active' : '') + (tab === id ? ' is-active' : '')} onClick={() => go(id)} aria-current={tab === id ? 'page' : undefined}>
          <span className="nav-icon">
            <Icon />
            {id === 'workout' && live && <i className="live-dot" aria-label={t('nav.live')} />}
          </span>
          <span>{t('nav.' + id)}</span>
        </button>
      ))}
      <div className="nav-foot"><ViewToggle /></div>
    </nav>
  );
}
