import { useStore } from '../lib/store.jsx';
import { t } from '../lib/i18n.js';

// K = Kryštof, C = Chiara
export default function ProfileBadge() {
  const { profile, prof } = useStore();
  if (!profile) return null;
  return <span className="prof-badge" title={`${t('prof.title')}: ${prof.name}`}>{prof.name[0]}</span>;
}
