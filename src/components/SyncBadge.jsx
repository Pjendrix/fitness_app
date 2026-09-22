import { useStore } from '../lib/store.jsx';
import { t } from '../lib/i18n.js';

// Offline / neodeslané změny – v posilovně chceš vědět, jestli je trénink už v cloudu.
export default function SyncBadge() {
  const { online, sync, mode } = useStore();
  if (mode !== 'firebase') return null;
  if (online && !sync.pending) return null;
  return (
    <div className={'sync-badge' + (online ? '' : ' is-offline')} role="status">
      <i aria-hidden="true" />
      {online ? t('sync.pending') : t('sync.offline')}
    </div>
  );
}
