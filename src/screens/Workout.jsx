import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useSession, useStore } from '../lib/store.jsx';
import { better, countUnchecked, uid, DECIMAL_INPUT, fmtClock, fmtSet, INT_INPUT, isDone, num } from '../lib/util.js';
import NumField, { oneStep, weightStep } from '../components/NumField.jsx';
import { primeAudio } from '../lib/rest.js';
import { ArrowDownIcon, ArrowUpIcon, CheckIcon, FlagIcon, FlameIcon, LinkIcon, MoreIcon, PencilIcon, PlateIcon, PlusIcon, SwapIcon, TrashIcon } from '../components/Icons.jsx';
import Sheet from '../components/Sheet.jsx';
import PlateCalc from '../components/PlateCalc.jsx';
import ExerciseSheet from '../components/ExerciseSheet.jsx';
import WorkoutSummary from '../components/WorkoutSummary.jsx';
import { nextTarget } from '../lib/progress.js';
import { templateDiffers } from '../lib/templateSync.js';
import { markGuide } from '../lib/guide.js';
import ExercisePicker from '../components/ExercisePicker.jsx';
import SwipeRow from '../components/SwipeRow.jsx';
import { InfoButton } from '../components/ExerciseInfo.jsx';
import { useDialog } from '../components/Dialog.jsx';
import { t } from '../lib/i18n.js';

// Časovač tréninku jako samostatná komponenta – tik každou sekundu nepřekresluje série.
function Elapsed({ since }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return <>{fmtClock(now - since)}</>;
}

const ssLetter = (active, ss) => {
  const ids = [];
  for (const e of active.exercises) if (e.ss && !ids.includes(e.ss)) ids.push(e.ss);
  return 'ABCDEFGH'[ids.indexOf(ss)] || '';
};

// Pořadí sloupců: opakování (nebo minuty) vlevo, váha vpravo.
// Pod sérií: „minule“ a cíl progrese (W1/W2). Klepnutí na číslo série = rozcvička (W8).
const SetRow = memo(function SetRow({ exId, set, n, timed, pb, prev, target, onPatch, onToggle, onRemove }) {
  const warm = Boolean(set.warm);
  const newPb = !warm && set.done && pb && better({ weight: num(set.weight), reps: timed ? 0 : num(set.reps), time: timed ? num(set.time) : 0 }, pb);
  const hit = target && set.done && num(set.weight) >= target.weight && num(set.reps) >= target.reps;
  return (
    <SwipeRow onDelete={() => onRemove(exId, set.id)} deleteLabel={t('wo.delSet', { n })} className={'set' + (set.done ? ' is-done' : '') + (warm ? ' is-warm' : '')}>
      <button type="button" className="set-n" aria-pressed={warm} aria-label={warm ? t('wo.warmOff') : t('wo.warmOn')} title={warm ? t('wo.warmOff') : t('wo.warmOn')} onClick={() => onPatch(exId, set.id, { warm: !warm })}>{warm ? 'W' : n}</button>
      {timed
        ? <NumField label={t('wo.time', { n })} placeholder="0" mode="decimal" pattern={DECIMAL_INPUT} value={set.time || ''} step={oneStep} onChange={(v) => onPatch(exId, set.id, { time: v })} />
        : <NumField label={t('wo.reps', { n })} placeholder="0" mode="numeric" pattern={INT_INPUT} value={set.reps} step={oneStep} onChange={(v) => onPatch(exId, set.id, { reps: v })} />}
      <NumField label={t('wo.weight', { n })} placeholder={timed ? '–' : 'BW'} mode="decimal" pattern={DECIMAL_INPUT} value={set.weight} step={weightStep} onChange={(v) => onPatch(exId, set.id, { weight: v })} />
      <button className="check" aria-label={set.done ? t('wo.uncheck') : t('wo.check')} aria-pressed={set.done} onClick={() => onToggle(exId, set, timed)}>
        <CheckIcon width={20} height={20} />
      </button>
      {newPb && <span className="new-pb">{t('wo.newPb')}</span>}
      {!warm && (prev || target) && (
        <span className="set-sub">
          {prev && <span>{t('wo.last')} {fmtSet(prev.weight, prev.reps, prev.time)}</span>}
          {target && <span className={hit ? 'is-hit' : ''}>{hit ? '✓ ' : ''}{t('wo.goal')} {fmtSet(target.weight, target.reps)}</span>}
        </span>
      )}
      {warm && <span className="set-sub"><span>{t('wo.warmNote')}</span></span>}
    </SwipeRow>
  );
});

const ExerciseCard = memo(function ExerciseCard({ ex, pb, ssLabel, ssEnd, handlers }) {
  const timed = ex.type === 'time';
  let j = -1; // pořadí pracovní série (rozcvičky se nečíslují)
  return (
    <section className={'card ex' + (ex.ss ? ' in-ss' : '') + (ex.ss && !ssEnd ? ' ss-open' : '')}>
      {ssLabel && <span className="ss-tag">{t('ss.label', { l: ssLabel })}</span>}
      <div className="ex-head">
        <div className="ex-title">
          <h2><button className="ex-name" onClick={() => handlers.detail(ex.key)}>{ex.name}</button> <InfoButton name={ex.name} /></h2>
          <p className="muted small">{[ex.plan, ex.hint && t('wo.recommended', { w: ex.hint }), ex.note].filter(Boolean).join(' · ')}</p>
        </div>
        {pb && <span className="pb" title={t('wo.pb')}>PB {fmtSet(pb.weight, pb.reps, pb.time)}</span>}
      </div>
      <div className="set-cols label" aria-hidden="true"><span>{t('wo.col.set')}</span><span>{timed ? t('wo.col.min') : t('wo.col.reps')}</span><span>{t('wo.col.kg')}</span><span /></div>
      {ex.sets.map((s) => {
        if (!s.warm) j++;
        const prev = !s.warm && ex.prev ? ex.prev[j] || null : null;
        const spec = ex.specs ? ex.specs[j] : ex.spec;
        const target = prev && !timed ? nextTarget(prev, spec) : null;
        return <SetRow key={s.id} exId={ex.id} set={s} n={j + 1} timed={timed} pb={pb} prev={prev} target={target} onPatch={handlers.patchSet} onToggle={handlers.toggle} onRemove={handlers.removeSet} />;
      })}
      {(ex.rpe || ex.memo) && (
        <button className="ex-memo" onClick={() => handlers.menu(ex.id, 'note')}>
          {ex.rpe ? <span className="mono">RPE {ex.rpe}</span> : null}{ex.memo ? <span>{ex.memo}</span> : null}
        </button>
      )}
      <div className="ex-actions">
        <button className="btn btn-ghost btn-sm" onClick={() => handlers.addSet(ex.id)}><PlusIcon width={16} height={16} /> {t('wo.addSet')}</button>
        <button className="btn btn-ghost btn-sm replace-btn" onClick={() => handlers.replace(ex.id)}><SwapIcon width={16} height={16} /> {t('rep.btn')}</button>
        <span className="spacer" />
        <button className="icon-btn ex-more" aria-label={t('wo.more', { name: ex.name })} onClick={() => handlers.menu(ex.id)}><MoreIcon width={20} height={20} /></button>
      </div>
    </section>
  );
});

// Menu cviku (W10: velké cíle 44 px): rozcvička, poznámka + RPE, kotouče, superset, pořadí, odebrat.
function ExerciseMenu({ ex, index, count, next, view, onClose, act }) {
  const [mode, setMode] = useState(view || 'menu');
  const [memo, setMemo] = useState(ex.memo || '');
  const [rpe, setRpe] = useState(ex.rpe || '');
  if (mode === 'note') {
    return (
      <Sheet label={t('wo.noteTitle')} onClose={onClose} className="sheet-short">
        <div className="sheet-head"><h2>{t('wo.noteTitle')}</h2><button className="btn btn-ghost btn-sm" onClick={onClose}>{t('pick.close')}</button></div>
        <p className="muted small">{ex.name}</p>
        <span className="label">{t('wo.rpe')}</span>
        <div className="rpe-row" role="radiogroup" aria-label={t('wo.rpe')}>
          {[6, 7, 8, 9, 10].map((v) => <button key={v} role="radio" aria-checked={Number(rpe) === v} className={'chip' + (Number(rpe) === v ? ' is-on' : '')} onClick={() => setRpe(Number(rpe) === v ? '' : v)}>{v}</button>)}
        </div>
        <p className="muted small">{t('wo.rpeHelp')}</p>
        <textarea className="input" rows={3} maxLength={200} placeholder={t('wo.notePh')} value={memo} onChange={(e) => setMemo(e.target.value)} />
        <button className="btn btn-primary btn-block" onClick={() => { act.patch(ex.id, { memo: memo.trim(), rpe }); onClose(); }}>{t('tpl.save')}</button>
      </Sheet>
    );
  }
  if (mode === 'plates') return <PlateCalc initial={num((ex.sets.find((s) => !s.done && !s.warm) || ex.sets[0] || {}).weight)} onClose={onClose} />;
  const row = (Icon, label, fn, cls = '') => (
    <button className={'menu-row ' + cls} onClick={fn}><Icon width={20} height={20} /><span>{label}</span></button>
  );
  const inSs = Boolean(ex.ss);
  return (
    <Sheet label={ex.name} onClose={onClose} className="sheet-short">
      <div className="sheet-head"><h2>{ex.name}</h2><button className="btn btn-ghost btn-sm" onClick={onClose}>{t('pick.close')}</button></div>
      <div className="menu-list">
        {row(FlameIcon, t('wo.addWarm'), () => { act.addWarm(ex.id); onClose(); })}
        {row(PencilIcon, t('wo.noteTitle'), () => setMode('note'))}
        {ex.type !== 'time' && row(PlateIcon, t('plate.title'), () => setMode('plates'))}
        {next && !(inSs && next.ss === ex.ss) && row(LinkIcon, t('ss.link', { name: next.name }), () => { act.link(ex.id); onClose(); })}
        {inSs && row(LinkIcon, t('ss.unlink'), () => { act.unlink(ex.id); onClose(); })}
        {row(ArrowUpIcon, t('wo.up'), () => { act.move(ex.id, -1); onClose(); }, index === 0 ? 'is-disabled' : '')}
        {row(ArrowDownIcon, t('wo.down'), () => { act.move(ex.id, 1); onClose(); }, index === count - 1 ? 'is-disabled' : '')}
        {row(TrashIcon, t('wo.removeEx'), () => { act.remove(ex.id); onClose(); }, 'is-danger')}
      </div>
    </Sheet>
  );
}

export default function Workout({ go }) {
  const { active, patchActive, prs, finishWorkout, discardWorkout, notify, addExerciseToActive, replaceExerciseInActive, startRest, stopRest } = useSession();
  const { templates, syncTemplate } = useStore();
  const dialog = useDialog();
  const [picking, setPicking] = useState(() => Boolean(active && !active.exercises.length));
  const [menu, setMenu] = useState(null); // { id, view }
  const [detailKey, setDetailKey] = useState(null);
  const [summary, setSummary] = useState(null);
  const activeRef = useRef(active);
  activeRef.current = active;
  const [replacingId, setReplacingId] = useState(null);
  const replacing = active?.exercises.find((e) => e.id === replacingId) || null;
  const live = Boolean(active);

  // Displej nezhasne během tréninku
  useEffect(() => {
    if (!live || !('wakeLock' in navigator)) return;
    let lock, stopped = false;
    const acquire = () => navigator.wakeLock.request('screen').then((l) => { if (stopped) l.release(); else lock = l; }).catch(() => {});
    const onVis = () => document.visibilityState === 'visible' && acquire();
    acquire();
    document.addEventListener('visibilitychange', onVis);
    return () => { stopped = true; document.removeEventListener('visibilitychange', onVis); lock?.release().catch(() => {}); };
  }, [live]);

  // ——— Akce podle stabilních id (ne indexů) ———
  const mapEx = useCallback((exId, fn) => patchActive((a) => ({ ...a, exercises: a.exercises.map((e) => (e.id === exId ? fn(e) : e)) })), [patchActive]);
  const patchSet = useCallback((exId, setId, patch) => mapEx(exId, (e) => ({ ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) })), [mapEx]);

  const toggle = useCallback((exId, set, timed) => {
    if (!set.done && !(timed ? num(set.time) > 0 : num(set.reps) > 0)) return notify(t('wo.needReps'));
    navigator.vibrate?.(12);
    primeAudio();
    patchSet(exId, set.id, { done: !set.done });
    if (set.done) return stopRest();
    markGuide('set');
    if (set.warm) return; // po rozcvičce bez pauzy
    // Superset: pauza až po posledním cviku skupiny
    const list = activeRef.current?.exercises || [];
    const i = list.findIndex((e) => e.id === exId);
    const cur = list[i], nx = list[i + 1];
    if (cur?.ss && nx?.ss === cur.ss) { stopRest(); return; }
    startRest();
  }, [notify, patchSet, startRest, stopRest]);

  // Rozcvičková série na začátek (cca polovina pracovní váhy)
  const addWarm = useCallback((exId) => mapEx(exId, (e) => {
    const w = num((e.sets.find((s) => !s.warm) || {}).weight);
    const half = w > 0 ? Math.round(w / 2 / 2.5) * 2.5 : '';
    return { ...e, sets: [{ id: uid(), weight: half ? String(half) : '', reps: '10', time: '', done: false, warm: true }, ...e.sets] };
  }), [mapEx]);

  // Superset s následujícím cvikem / zrušení
  const link = useCallback((exId) => patchActive((a) => {
    const i = a.exercises.findIndex((e) => e.id === exId), nx = a.exercises[i + 1];
    if (i < 0 || !nx) return a;
    const id = a.exercises[i].ss || nx.ss || uid().slice(0, 6);
    return { ...a, exercises: a.exercises.map((e, k) => (k === i || k === i + 1 || (e.ss && (e.ss === a.exercises[i].ss || e.ss === nx.ss)) ? { ...e, ss: id } : e)) };
  }), [patchActive]);
  const unlink = useCallback((exId) => patchActive((a) => {
    const ss = a.exercises.find((e) => e.id === exId)?.ss;
    let list = a.exercises.map((e) => (e.id === exId ? { ...e, ss: '' } : e));
    if (list.filter((e) => e.ss === ss).length < 2) list = list.map((e) => (e.ss === ss ? { ...e, ss: '' } : e));
    return { ...a, exercises: list };
  }), [patchActive]);
  const patchEx = useCallback((exId, patch) => mapEx(exId, (e) => ({ ...e, ...patch })), [mapEx]);

  const addSet = useCallback((exId) => mapEx(exId, (e) => {
    const prev = e.sets[e.sets.length - 1] || {};
    return { ...e, sets: [...e.sets, { id: uid(), weight: prev.weight || '', reps: prev.reps || '', time: prev.time || '', done: false }] };
  }), [mapEx]);

  // Smazání cviku s možností vrátit (místo potvrzovacího dialogu)
  const removeExercise = useCallback((exId) => {
    let removed = null, at = -1;
    patchActive((a) => {
      at = a.exercises.findIndex((e) => e.id === exId);
      removed = a.exercises[at];
      return { ...a, exercises: a.exercises.filter((e) => e.id !== exId) };
    });
    // removed/at se naplní při aplikaci updateru; akce „Zpět“ běží až potom
    notify(t('wo.exRemoved'), {
      action: { label: t('undo.btn'), run: () => removed && patchActive((a) => { const ex = [...a.exercises]; ex.splice(Math.min(at, ex.length), 0, removed); return { ...a, exercises: ex }; }) },
    });
  }, [patchActive, notify]);

  // Smazání série swipem; poslední série smaže celý cvik. Vždy s „Zpět“.
  const removeSet = useCallback((exId, setId) => {
    let removed = null, at = -1, wasLast = false, exAt = -1, exRemoved = null;
    patchActive((a) => {
      exAt = a.exercises.findIndex((e) => e.id === exId);
      const e = a.exercises[exAt];
      if (!e) return a;
      at = e.sets.findIndex((s) => s.id === setId);
      removed = e.sets[at];
      if (e.sets.length === 1) {
        wasLast = true;
        exRemoved = e;
        return { ...a, exercises: a.exercises.filter((x) => x.id !== exId) };
      }
      return { ...a, exercises: a.exercises.map((x) => (x.id === exId ? { ...x, sets: x.sets.filter((s) => s.id !== setId) } : x)) };
    });
    notify(t('wo.setRemoved'), {
      action: {
        label: t('undo.btn'),
        run: () => patchActive((a) => {
          if (wasLast && exRemoved) { const ex = [...a.exercises]; ex.splice(Math.min(exAt, ex.length), 0, exRemoved); return { ...a, exercises: ex }; }
          if (!removed) return a;
          return { ...a, exercises: a.exercises.map((x) => { if (x.id !== exId) return x; const sets = [...x.sets]; sets.splice(Math.min(at, sets.length), 0, removed); return { ...x, sets }; }) };
        }),
      },
    });
  }, [patchActive, notify]);

  const move = useCallback((exId, dir) => patchActive((a) => {
    const i = a.exercises.findIndex((e) => e.id === exId), j = i + dir;
    if (i < 0 || j < 0 || j >= a.exercises.length) return a;
    const ex = [...a.exercises];
    [ex[i], ex[j]] = [ex[j], ex[i]];
    return { ...a, exercises: ex };
  }), [patchActive]);

  const [handlers] = useState(() => ({}));
  Object.assign(handlers, {
    patchSet, toggle, addSet, removeSet, removeExercise, move, replace: setReplacingId,
    menu: (id, view) => setMenu({ id, view }), detail: setDetailKey,
  }); // stabilní objekt, aktuální funkce

  if (summary) return <WorkoutSummary done={summary} onClose={() => { setSummary(null); go('history'); }} />;
  if (!active) {
    return (
      <div className="screen">
        <header className="screen-head"><h1>{t('wo.title')}</h1></header>
        <div className="card empty-card">
          <p>{t('wo.none')}</p>
          <button className="btn btn-primary" onClick={() => go('templates')}>{t('wo.pickTemplate')}</button>
        </div>
      </div>
    );
  }

  const finish = async () => {
    const pending = countUnchecked(active);
    let includeUnchecked = false;
    if (pending) {
      const choice = await dialog.choose({
        title: t('wo.uncheckedTitle', { n: pending }),
        message: t('wo.uncheckedMsg'),
        actions: [
          { value: 'tick', label: t('wo.tickSave'), primary: true },
          { value: 'drop', label: t('wo.dropSave') },
          { value: null, label: t('dlg.cancel') },
        ],
      });
      if (!choice) return;
      includeUnchecked = choice === 'tick';
    }
    // W4: změnila se struktura oproti šabloně → nabídnout aktualizaci
    const tpl = templates.find((x) => x.id === active.templateId);
    let sync = false;
    if (tpl && templateDiffers(tpl, active)) {
      const c = await dialog.choose({
        title: t('wo.syncTitle', { name: tpl.name }),
        message: t('wo.syncMsg'),
        actions: [
          { value: 'yes', label: t('wo.syncYes'), primary: true },
          { value: 'no', label: t('wo.syncNo') },
          { value: null, label: t('dlg.cancel') },
        ],
      });
      if (!c) return;
      sync = c === 'yes';
    }
    const snapshot = active;
    const r = finishWorkout({ includeUnchecked });
    if (r.empty) return notify(t('wo.needOne'));
    if (sync && syncTemplate(tpl.id, snapshot)) notify(t('wo.synced', { name: tpl.name }));
    window.scrollTo({ top: 0 });
    setSummary(r.done);
  };
  const discard = async () => {
    if (await dialog.confirm(t('wo.confirmDiscard'), { danger: true, ok: t('wo.discard') })) discardWorkout();
  };

  const doneCount = active.exercises.reduce((n, e) => n + e.sets.filter(isDone).length, 0);
  const total = active.exercises.reduce((n, e) => n + e.sets.length, 0);

  return (
    <div className="screen">
      <header className="workout-head">
        <div>
          <h1>{active.name}</h1>
          <p className="label"><Elapsed since={active.startedAt} /> · {t('wo.sets', { done: doneCount, total })}</p>
        </div>
        <button className="btn btn-finish" onClick={finish}>{t('wo.finish')}</button>
      </header>
      <div className="progress" aria-hidden="true"><i style={{ width: `${total ? (doneCount / total) * 100 : 0}%` }} /></div>
      {active.exercises.length > 0 && <p className="muted small swipe-hint">{t('wo.swipeHint')}</p>}

      {active.exercises.map((e, ei) => {
        const prevEx = active.exercises[ei - 1], nextEx = active.exercises[ei + 1];
        const first = e.ss && prevEx?.ss !== e.ss;
        return <ExerciseCard key={e.id} ex={e} pb={prs[e.key]} ssLabel={first ? ssLetter(active, e.ss) : ''} ssEnd={!e.ss || nextEx?.ss !== e.ss} handlers={handlers} />;
      })}

      {!active.exercises.length && <p className="empty">{t('wo.addFirst')}</p>}
      <button className={'btn btn-block ' + (active.exercises.length ? 'btn-ghost' : 'btn-primary')} onClick={() => setPicking(true)}><PlusIcon width={16} height={16} /> {t('wo.addEx')}</button>
      {active.exercises.length > 0 && (
        <button className="btn btn-finish btn-lg btn-block finish-bottom" onClick={finish}><FlagIcon width={18} height={18} /> {t('wo.finishLong')}</button>
      )}
      <button className="btn btn-danger btn-block discard-btn" onClick={discard}>{t('wo.discard')}</button>

      {picking && (
        <ExercisePicker
          exclude={active.exercises.map((e) => e.key)}
          onClose={() => setPicking(false)}
          onPick={(ex) => { addExerciseToActive(ex); setPicking(false); }}
        />
      )}
      {menu && (() => {
        const i = active.exercises.findIndex((e) => e.id === menu.id);
        if (i < 0) return null;
        return (
          <ExerciseMenu key={menu.id + (menu.view || '')} ex={active.exercises[i]} index={i} count={active.exercises.length} next={active.exercises[i + 1]} view={menu.view}
            onClose={() => setMenu(null)} act={{ addWarm, link, unlink, move, remove: removeExercise, patch: patchEx }} />
        );
      })()}
      {detailKey && <ExerciseSheet exKey={detailKey} onClose={() => setDetailKey(null)} />}
      {replacing && (
        <ExercisePicker
          replacing={replacing}
          exclude={active.exercises.map((e) => e.key)}
          onClose={() => setReplacingId(null)}
          onPick={(ex) => { replaceExerciseInActive(replacing.id, ex); setReplacingId(null); }}
        />
      )}
    </div>
  );
}
