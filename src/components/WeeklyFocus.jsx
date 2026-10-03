import { useMemo } from 'react';
import { weeklyFocus } from '../lib/gamify.js';
import { t } from '../lib/i18n.js';
import { fmtNum } from '../lib/util.js';
import { CheckIcon } from './Icons.jsx';

// Weekly focus: max. 3 tichá doporučení z dat. Nesplnění nic nestojí, splnění se jen odškrtne.
export default function WeeklyFocus({ workouts, goal, groups, body, groupLabel, onExercise }) {
  const items = useMemo(() => weeklyFocus(workouts, { goal, groups, body }), [workouts, goal, groups, body]);
  if (!workouts.length || !items.length) return null;
  const done = items.filter((i) => i.done).length;

  const text = (i) => {
    if (i.kind === 'lag') return i.done ? t('focus.lagDone', { g: groupLabel(i.group) }) : t('focus.lag', { g: groupLabel(i.group), n: i.days });
    if (i.kind === 'record') return i.done ? t('focus.recordDone', { ex: i.name }) : t('focus.record', { ex: i.name });
    if (i.kind === 'body') return t('focus.body');
    return t('focus.goal', { n: i.goal });
  };
  const meta = (i) => {
    if (i.kind === 'record' && !i.done) return t('focus.recordSub', { v: fmtNum(i.e1) });
    if (i.kind === 'goal') return `${Math.min(i.count, i.goal)} / ${i.goal}`;
    return t('focus.tag.' + i.kind);
  };

  return (
    <section className="card list focus" aria-label={t('focus.title')}>
      <div className="card-head focus-head"><h2>{t('focus.title')}</h2><span className="label">{done} / {items.length}</span></div>
      {items.map((i) => {
        const body = (
          <>
            <span className={'focus-dot' + (i.done ? ' is-done' : '')} aria-hidden="true">{i.done && <CheckIcon width={12} height={12} />}</span>
            <span className="focus-text">{text(i)}</span>
            <span className="label focus-meta">{meta(i)}</span>
          </>
        );
        const cls = 'row focus-row' + (i.done ? ' is-done' : '');
        const sr = <span className="sr-only">{i.done ? t('focus.srDone') : t('focus.srOpen')}</span>;
        return i.kind === 'record' && onExercise
          ? <button key={i.id} className={cls + ' row-link'} onClick={() => onExercise(i.key)}>{sr}{body}</button>
          : <div key={i.id} className={cls}>{sr}{body}</div>;
      })}
    </section>
  );
}
