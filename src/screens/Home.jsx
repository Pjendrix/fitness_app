import { useMemo, useState } from 'react';
import Sheet from '../components/Sheet.jsx';
import { useSession, useStore } from '../lib/store.jsx';
import ViewToggle from '../components/ViewToggle.jsx';
import ProfileBadge from '../components/ProfileBadge.jsx';
import { colorHex, PROFILES } from '../data/defaultTemplates.js';
import { fmtDate, fmtNum, fmtSet, startOfWeek, workoutVolume } from '../lib/util.js';
import { t } from '../lib/i18n.js';

export default function Home({ go }) {
  const { user, workouts, prs, templates, startWorkout, startEmptyWorkout, profile, setProfile, loading, main, groupLabel, groupSub, mode } = useStore();
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

  const week = useMemo(() => {
    const from = startOfWeek();
    const ws = workouts.filter((w) => w.startedAt >= from);
    return { count: ws.length, volume: ws.reduce((s, w) => s + workoutVolume(w), 0) };
  }, [workouts]);

  const recentPrs = useMemo(() => Object.values(prs).sort((a, b) => b.date - a.date).slice(0, 3), [prs]);

  const tpl = inGroup.find((x) => x.id === variant);
  const first = (user?.name || '').split(' ')[0];

  return (
    <div className="screen">
      <header className="screen-head">
        <div className="row-between home-top"><p className="muted hi"><span className="mobile-badge"><ProfileBadge /></span>{first ? t('home.hiName', { name: first }) : t('home.hi')}</p><ViewToggle /></div>
        <h1>{t('home.title')}</h1>
      </header>

      {!profile && !loading && (
        <section className="card profile-pick">
          <h2>{t('prof.pick')}</h2>
          <p className="muted small">{t('prof.pickSub')}</p>
          <div className="row-actions">
            {Object.values(PROFILES).map((p) => <button key={p.id} className="btn btn-primary" onClick={() => setProfile(p.id)}>{mode === 'demo' ? t(p.id === 'krystof' ? 'prof.demoA' : 'prof.demoB') : p.name}</button>)}
          </div>
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

      <section className="stats" onClick={() => go('stats')} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), go('stats'))} role="button" tabIndex={0} aria-label={t('home.openStats')}>
        <div className="card stat"><span className="num">{week.count}</span><span className="muted small">{t('home.weekWorkouts')}</span></div>
        <div className="card stat"><span className="num">{week.volume ? fmtNum(Math.round(week.volume / 100) / 10) : 0}<small> t</small></span><span className="muted small">{t('home.weekVolume')}</span></div>
        <div className="card stat"><span className="num">{workouts.length}</span><span className="muted small">{t('home.total')}</span></div>
      </section>

      {!active && (
        <>
          <button className="btn btn-primary btn-block btn-lg" onClick={() => { startEmptyWorkout(); go('workout'); }}>{t('home.empty')}</button>
          <button className="btn btn-ghost btn-block btn-lg" onClick={() => (mine.length ? setPickMine(true) : go('templates'))}>{t('home.mine')}</button>
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

      <section>
        <div className="row-between"><h3 className="section-title">{t('home.recentPrs')}</h3><button className="link" onClick={() => go('stats')}>{t('home.allStats')}</button></div>
        {recentPrs.length ? (
          <div className="card list">
            {recentPrs.map((p) => (
              <div className="row" key={p.name}>
                <div><div>{p.name}</div><div className="muted small">{fmtDate(p.date)}</div></div>
                <span className="pb">{fmtSet(p.weight, p.reps, p.time)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty">{t('home.noPrs')}</p>
        )}
      </section>
    </div>
  );
}
