// Progress: vše motivační na jednom místě (Forge Heat) – Heat, Weekly focus, Milestones, měsíční kapitoly.
// Otevírá se ze Stats (záložka Progress) nebo z karty týdne na Home. Když je Forge Heat vypnutý, není vidět.
import { useEffect, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { t } from '../lib/i18n.js';
import { goBack } from '../lib/nav.js';
import HeatCard from '../components/HeatCard.jsx';
import WeeklyFocus from '../components/WeeklyFocus.jsx';
import Milestones from '../components/Milestones.jsx';
import MonthlyRecap, { useRecapTeaser } from '../components/MonthlyRecap.jsx';
import ExerciseSheet from '../components/ExerciseSheet.jsx';
import { BodySheet } from '../components/BodyWeight.jsx';
import { BackLink } from '../components/ExerciseDetail.jsx';
import { XIcon } from '../components/Icons.jsx';

export default function Progress({ go, tabs }) {
  const { workouts, weeklyGoal, main, body, groupLabel } = useStore();
  const recap = useRecapTeaser();
  const [recapOpen, setRecapOpen] = useState(false);
  const [exOpen, setExOpen] = useState(null);
  const [bodyOpen, setBodyOpen] = useState(false);
  useEffect(() => { window.scrollTo({ top: 0 }); }, []);
  const groups = main.groups.map((g) => g.id);

  return (
    <div className="screen prog-screen">
      <header className="screen-head ms-head">
        <BackLink label={t('nav.back')} onClick={() => goBack(go)} />
        <div className="ms-title"><h1>{t('prog.title')}</h1></div>
      </header>
      {tabs}

      {recap.show && (
        <section className="card recap-teaser">
          <div>
            <p className="label">{t('recap.teaserEyebrow')}</p>
            <h2>{t('recap.teaser', { m: recap.name })}</h2>
          </div>
          <div className="recap-teaser-actions">
            <button className="btn btn-primary btn-sm" onClick={() => { setRecapOpen(true); recap.markSeen(); }}>{t('recap.open')}</button>
            <button className="icon-btn" aria-label={t('guide.hide')} onClick={recap.markSeen}><XIcon width={16} height={16} /></button>
          </div>
        </section>
      )}

      {workouts.length > 0 && <HeatCard workouts={workouts} goal={weeklyGoal} />}
      <WeeklyFocus workouts={workouts} goal={weeklyGoal} groups={groups} body={body} groupLabel={groupLabel} onExercise={setExOpen} onBody={() => setBodyOpen(true)} />
      <h2 className="prog-sec">{t('hist.sec.milestones')}</h2>
      <Milestones go={go} />

      {recapOpen && <MonthlyRecap month={recap.month} onClose={() => setRecapOpen(false)} />}
      {exOpen && <ExerciseSheet exKey={exOpen} onClose={() => setExOpen(null)} />}
      {bodyOpen && <BodySheet onClose={() => setBodyOpen(false)} />}
    </div>
  );
}
