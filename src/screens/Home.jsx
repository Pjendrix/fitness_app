import { useMemo, useState } from 'react';
import Sheet from '../components/Sheet.jsx';
import { useSession, useStore } from '../lib/store.jsx';
import { XIcon } from '../components/Icons.jsx';
import { guideState, hideGuide } from '../lib/guide.js';
import { useStartTour } from '../components/Tour.jsx';
import ProfileBadge from '../components/ProfileBadge.jsx';
import WeekCard from '../components/WeekCard.jsx';
import DeloadCard from '../components/DeloadCard.jsx';
import { setStatsTab } from '../lib/statsTab.js';
import { colorHex, STARTER_IDS } from '../data/defaultTemplates.js';
import { t } from '../lib/i18n.js';

export default function Home({ go }) {
  const { user, workouts, templates, startWorkout, startEmptyWorkout, needsSetup, chooseStarter, main, groupLabel, groupSub, mode } = useStore();
  const [guide, setGuide] = useState(guideState);
  const startTour = useStartTour(go);
  const { active } = useSession();
  // Groups that have at least one template
  const G = useMemo(() => main.groups.map((g) => g.id).filter((id) => main.templates.some((x) => x.group === id)), [main]);
  const [pickedVariant, setVariant] = useState(null);
  const [pickMine, setPickMine] = useState(false);
  const mine = templates.filter((x) => !x.builtin);

  // Next in the PUSH → PULL → LEGS rotation based on the last workout
  const next = useMemo(() => {
    const last = workouts.find((w) => G.includes(w.group));
    return last ? G[(G.indexOf(last.group) + 1) % G.length] : G[0];
  }, [workouts, G]);
  const [picked, setGroup] = useState(null);
  const group = picked && G.includes(picked) ? picked : next;
  const inGroup = main.templates.filter((x) => x.group === group);
  const variants = inGroup.map((x) => x.id);
  const variant = variants.includes(pickedVariant) ? pickedVariant : variants[0];

  // Home = jen start tréninku + jedna karta týdne; vše ostatní (Heat, Milestones, čísla) je ve Stats
  const openStats = (tab) => { setStatsTab(tab); go('stats'); };

  const tpl = inGroup.find((x) => x.id === variant);
  const first = (user?.name || '').split(' ')[0];

  return (
    <div className="screen">
      <header className="screen-head">
        <div className="row-between home-top"><p className="muted hi"><span className="mobile-badge"><ProfileBadge /></span>{first ? t('home.hiName', { name: first }) : t('home.hi')}</p></div>
        <h1>{t('home.title')}</h1>
      </header>

      {needsSetup && (
        <section className="card starter-pick">
          <h2>{t('start.title')}</h2>
          <p className="muted small">{t('start.sub')}</p>
          <div className="starter-grid">
            {STARTER_IDS.map((id) => (
              <button key={id} className="starter" onClick={() => chooseStarter(id)}>
                <b>{t('start.' + id)}</b><span className="muted small">{t('start.' + id + 'Sub')}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {guide.show && !needsSetup && (mode === 'demo' || workouts.length < 5) && (
        <section className="card guide" aria-label={t('guide.title')}>
          <div className="row-between"><h2>{t('guide.title')}</h2><button className="icon-btn" aria-label={t('guide.hide')} onClick={() => { hideGuide(); setGuide(guideState()); }}><XIcon width={16} height={16} /></button></div>
          {mode === 'demo' && <button className="btn btn-primary btn-block" onClick={startTour}>{t('tour.start')}</button>}
          <ol className="guide-steps">
            {['start', 'set', 'stats'].map((k, i) => (
              <li key={k} className={guide[k] ? 'is-done' : ''}><span className="guide-n">{guide[k] ? '✓' : i + 1}</span><span><b>{t('guide.' + k)}</b><span className="muted small">{t('guide.' + k + 'Sub')}</span></span></li>
            ))}
          </ol>
        </section>
      )}


      {active ? (
        <section className="card card-hero">
          <p className="label">{t('home.unfinished')}</p>
          <h2 className="big">{active.name}</h2>
          <button className="btn btn-primary btn-block" onClick={() => go('workout')}>{t('home.continue')}</button>
        </section>
      ) : tpl && (
        <section className="card card-hero">
          <p className="label">{t('home.quickStart')}{group === next ? ` · ${t('home.upNext')}` : ''}</p>
          <div className="seg" role="tablist">
            {G.map((g) => (
              <button key={g} role="tab" aria-selected={group === g} className={group === g ? 'is-on' : ''} onClick={() => setGroup(g)}>{groupLabel(g)}</button>
            ))}
          </div>
          <p className="group-sub">{groupSub(group)}</p>
          {variants.length > 1 && <div className="seg seg-sm" role="tablist">
            {variants.map((v) => (
              <button key={v} role="tab" aria-selected={variant === v} className={variant === v ? 'is-on' : ''} onClick={() => setVariant(v)}>{inGroup.find((x) => x.id === v).variant || '•'}</button>
            ))}
          </div>}
          <p className="label">{t('count.exercises', { n: tpl.exercises.length })} · {t('count.sets', { n: tpl.exercises.reduce((s, e) => s + e.sets, 0) })}</p>
          <button className="btn btn-primary btn-block" onClick={() => { startWorkout(tpl); go('workout'); }}>{t('home.start', { name: tpl.name })}</button>
        </section>
      )}

      {!needsSetup && <WeekCard onOpen={openStats} />}
      {!needsSetup && !active && <DeloadCard />}

      {!active && (
        <>
        <div className="home-alt">
          <button className="btn btn-ghost" onClick={() => { startEmptyWorkout(); go('workout'); }}>{t('home.empty')}</button>
          <button className="btn btn-ghost" onClick={() => (mine.length ? setPickMine(true) : go('templates'))}>{t('home.mine')}</button>
        </div>
        </>
      )}

      {pickMine && (
        <Sheet label={t('home.mine')} onClose={() => setPickMine(false)} className="sheet-short">
            <div className="sheet-head">
              <h2>{t('home.mine')}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setPickMine(false)}>{t('pick.close')}</button>
            </div>
            <div className="sheet-list">
              {mine.map((x) => {
                const hex = colorHex(x.color);
                return (
                  <button key={x.id} className="pick mine-pick" onClick={() => { startWorkout(x); setPickMine(false); go('workout'); }}>
                    <span className="mine-name">{hex && <i className="dot" style={{ background: hex }} />}{x.name}</span>
                    <span className="label">{t('count.exercises', { n: x.exercises.length })} · {t('count.sets', { n: x.exercises.reduce((n, e) => n + e.sets, 0) })}</span>
                  </button>
                );
              })}
            </div>
        </Sheet>
      )}

    </div>
  );
}
