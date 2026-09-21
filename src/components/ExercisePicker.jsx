import { useState } from 'react';
import { CATEGORIES } from '../data/exercises.js';
import { useStore } from '../lib/store.jsx';
import { exKey } from '../lib/util.js';
import { t } from '../lib/i18n.js';
import { PlusIcon } from './Icons.jsx';

export const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Bottom sheet: search + muscle-group filter. Can create a new exercise (saved to the library).
// Small tag: weight × reps vs. timed
export function TypeTag({ type }) {
  return <span className={'type-tag' + (type === 'time' ? ' is-time' : '')}>{type === 'time' ? '⏱ ' + t('type.time') : t('type.reps')}</span>;
}

export default function ExercisePicker({ onPick, onClose, exclude = [] }) {
  const { library, addToLibrary, prs, typeOf } = useStore();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [newCat, setNewCat] = useState(CATEGORIES[0]);
  const [newType, setNewType] = useState('reps');

  const query = norm(q.trim());
  const list = library
    .filter((e) => (cat === 'all' || e.cat === cat) && norm(e.name).includes(query))
    .sort((a, b) => a.name.localeCompare(b.name));
  const exact = library.some((e) => norm(e.name) === query);
  const skip = new Set(exclude);

  const createCustom = () => {
    const ex = { name: q.trim(), cat: newCat, type: newType };
    addToLibrary(ex);
    onPick(ex);
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={t('pick.title')} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h2>{t('pick.title')}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>{t('pick.close')}</button>
        </div>
        <input className="input" autoFocus placeholder={t('pick.search')} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="chips">
          {['all', ...CATEGORIES].map((c) => (
            <button key={c} className={'chip' + (cat === c ? ' is-on' : '')} onClick={() => setCat(c)}>{c === 'all' ? t('pick.all') : t('cat.' + c)}</button>
          ))}
        </div>
        <div className="sheet-list">
          {list.map((e) => {
            const key = exKey(e.name);
            const pb = prs[key];
            return (
              <button key={e.name} className="pick" disabled={skip.has(key)} onClick={() => onPick(e)}>
                <span>{e.name}</span>
                <span className="pick-meta">
                  <span className="label">{skip.has(key) ? t('pick.inWorkout') : pb ? `PB ${pb.weight || 'BW'}×${pb.reps}` : t('cat.' + e.cat)}</span>
                  <TypeTag type={typeOf(e.name)} />
                </span>
              </button>
            );
          })}
          {!list.length && !query && <p className="empty">{t('pick.none')}</p>}
          {query && !exact && (
            <div className="custom-ex">
              <p>{t('pick.create', { name: q.trim() })}</p>
              <div className="row-actions">
                <select className="input" value={newCat} onChange={(e) => { setNewCat(e.target.value); if (e.target.value === 'cardio') setNewType('time'); }} aria-label={t('pick.category')}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{t('cat.' + c)}</option>)}
                </select>
                <select className="input" value={newType} onChange={(e) => setNewType(e.target.value)} aria-label={t('type.label')}>
                  <option value="reps">{t('type.repsLong')}</option>
                  <option value="time">{t('type.timeLong')}</option>
                </select>
                <button className="btn btn-primary btn-sm" onClick={createCustom}><PlusIcon width={16} height={16} /> {t('pick.createBtn')}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
