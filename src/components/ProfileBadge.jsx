import { useStore } from '../lib/store.jsx';
import { t } from '../lib/i18n.js';

// K = Kryštof, C = Chiara
export default function ProfileBadge() {
  const { profile, prof, mode } = useStore();
  if (!profile) return null;
  const name = mode === 'demo' ? t(prof.id === 'krystof' ? 'prof.demoA' : 'prof.demoB') : prof.name;
  return <span className="prof-badge" title={`${t('prof.title')}: ${name}`}>{mode === 'demo' ? name.slice(-1) : name[0]}</span>;
}
