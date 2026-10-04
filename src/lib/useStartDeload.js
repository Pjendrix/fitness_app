// Spuštění lehkého týdne s volbou režimu (Domů i Nastavení)
import { useDialog } from '../components/Dialog.jsx';
import { useStore } from './store.jsx';
import { t } from './i18n.js';

export function useStartDeload() {
  const dialog = useDialog();
  const { startDeload } = useStore();
  return async () => {
    const mode = await dialog.choose({
      title: t('dl.pickTitle'),
      message: t('dl.pickMsg'),
      actions: [
        { value: 'light', label: t('dl.modeLight'), primary: true },
        { value: 'short', label: t('dl.modeShort') },
        { value: null, label: t('dlg.cancel') },
      ],
    });
    if (mode) startDeload(mode);
    return mode;
  };
}
