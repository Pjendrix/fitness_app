import { useStore } from '../lib/store.jsx';

// Iniciála přihlášeného účtu v barvě akcentu
export default function ProfileBadge() {
  const { user } = useStore();
  if (!user) return null;
  const name = (user.name || user.email || '?').trim();
  return <span className="prof-badge" title={name}>{name[0].toUpperCase()}</span>;
}
