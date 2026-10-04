import { useMemo, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { deloadAdvice } from '../lib/progress.js';
import { t } from '../lib/i18n.js';
import { XIcon } from './Icons.jsx';
import { useStartDeload } from '../lib/useStartDeload.js';

const snoozeKey = (uid) => `forge:dlSnooze:${uid}`;
const SNOOZE_DAYS = 14;

// Návrh lehkého týdne na Home – nabídka, nikdy povinnost. „Teď ne“ ho schová na 2 týdny.
export default function DeloadCard() {
  const { user, workouts, weeklyGoal, breaks } = useStore();
  const startDeload = useStartDeload();
  const [snoozed, setSnoozed] = useState(() => { try { return Number(localStorage.getItem(snoozeKey(user?.uid))) || 0; } catch { return 0; } });
  const advice = useMemo(() => deloadAdvice(workouts, { goal: weeklyGoal, breaks }), [workouts, weeklyGoal, breaks]);
  if (!advice || snoozed > Date.now()) return null;
  const snooze = () => {
    const until = Date.now() + SNOOZE_DAYS * 864e5;
    try { localStorage.setItem(snoozeKey(user?.uid), String(until)); } catch { /* ignore */ }
    setSnoozed(until);
  };
  return (
    <section className="card deload-card">
      <div className="row-between">
        <p className="label">{t('dl.eyebrow')}</p>
        <button className="icon-btn" aria-label={t('dl.later')} onClick={snooze}><XIcon width={16} height={16} /></button>
      </div>
      <h2>{t('dl.title')}</h2>
      <p className="small">{advice.reason === 'weeks' ? t('dl.whyWeeks', { n: advice.weeks }) : t('dl.whyDrop', { n: advice.n })} {t('dl.what')}</p>
      <div className="deload-actions">
        <button className="btn btn-primary btn-sm" onClick={startDeload}>{t('dl.start')}</button>
        <button className="btn btn-ghost btn-sm" onClick={snooze}>{t('dl.later')}</button>
      </div>
    </section>
  );
}
