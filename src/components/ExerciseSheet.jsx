import Sheet from './Sheet.jsx';
import { ExerciseDetail } from './ExerciseDetail.jsx';
import { useStore } from '../lib/store.jsx';
import { t } from '../lib/i18n.js';

// W5 / H3: historie cviku v panelu (z tréninku i z historie), bez opuštění obrazovky.
export default function ExerciseSheet({ exKey, onClose }) {
  const { workouts } = useStore();
  const name = workouts.find((w) => w.exercises.some((e) => e.key === exKey))?.exercises.find((e) => e.key === exKey)?.name || '';
  return (
    <Sheet label={name || t('ms.title')} onClose={onClose} className="sheet-tall">
      <div className="sheet-head"><span /><button className="btn btn-ghost btn-sm" onClick={onClose}>{t('pick.close')}</button></div>
      <ExerciseDetail exKey={exKey} embedded />
    </Sheet>
  );
}
