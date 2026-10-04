// Progress (záložka ve Stats): Heat, Milestones a měsíční kapitoly. Hlavička je stejná jako u záložky Numbers,
// aby přepínání nepůsobilo jako jiná obrazovka. Desktop: dva sloupce (Heat + souhrn | karty milníků).
import { useEffect, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { t } from '../lib/i18n.js';
import { useViewMode } from '../lib/viewMode.js';
import HeatCard from '../components/HeatCard.jsx';
import Milestones from '../components/Milestones.jsx';
import MonthlyRecap, { useRecapTeaser } from '../components/MonthlyRecap.jsx';
import { XIcon } from '../components/Icons.jsx';
import { markGuide } from '../lib/guide.js';

export default function Progress({ go, tabs }) {
  const { workouts, weeklyGoal, breaks } = useStore();
  const { desktop } = useViewMode();
  const recap = useRecapTeaser();
  const [recapOpen, setRecapOpen] = useState(false);
  useEffect(() => { window.scrollTo({ top: 0 }); markGuide('stats'); }, []);

  const teaser = recap.show && (
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
  );
  const heat = workouts.length > 0 && <HeatCard workouts={workouts} goal={weeklyGoal} breaks={breaks} />;

  return (
    <div className={'screen prog-screen' + (desktop ? ' screen-wide' : ' ms')}>
      {desktop
        ? <header className="screen-head"><h1>{t('ms.title')}</h1></header>
        : (
          <header className="screen-head ms-head">
            <div className="ms-title"><h1>{t('ms.title')}</h1></div>
          </header>
        )}
      {tabs}
      {desktop ? (
        <div className="prog-grid">
          <div className="prog-col">{teaser}{heat}<Milestones go={go} part="side" /></div>
          <div className="prog-col"><Milestones go={go} part="list" /></div>
        </div>
      ) : (
        <>
          {teaser}
          {heat}
          <Milestones go={go} />
        </>
      )}
      {recapOpen && <MonthlyRecap month={recap.month} onClose={() => setRecapOpen(false)} />}
    </div>
  );
}
