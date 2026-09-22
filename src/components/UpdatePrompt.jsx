import { useRegisterSW } from 'virtual:pwa-register/react';
import { t } from '../lib/i18n.js';

// Nová verze appky: nabídne obnovení místo tichého čekání na další spuštění.
export default function UpdatePrompt() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      // Kontrola aktualizace každou hodinu, když appka zůstane otevřená
      if (reg) setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    },
  });
  if (!needRefresh) return null;
  return (
    <div className="update-banner" role="status">
      <span>{t('upd.ready')}</span>
      <button className="toast-action" onClick={() => updateServiceWorker(true)}>{t('upd.reload')}</button>
      <button className="toast-action muted-action" aria-label={t('pick.close')} onClick={() => setNeedRefresh(false)}>✕</button>
    </div>
  );
}
