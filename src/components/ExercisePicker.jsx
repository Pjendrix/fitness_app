import { useEffect, useState } from 'react';
import { fromDb, loadDb } from '../lib/exerciseDb.js';
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

// mode 'db' = browse the exercise database only (Exercises tab)
export default function ExercisePicker({ onPick, onClose, exclude = [], mode }) {
  const { library, addToLibrary, prs, typeOf, infoOf } = useStore();
  const [db, setDb] = useState(null);
  const [dbErr, setDbErr] = useState(false);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [newCat, setNewCat] = useState(CATEGORIES[0]);
  const [newType, setNewType] = useState('reps');

  const query = norm(q.trim());
  const dbOnly = mode === 'db';
  const wantDb = dbOnly || query.length >= 2;
  useEffect(() => {
    if (!wantDb || db) return;
    loadDb().then(setDb).catch(() => setDbErr(true));
  }, [wantDb, db]);
  const inLib = new Set(library.map((e) => exKey(e.name)));
  const dbList = !db || !wantDb ? [] : db
    .map(fromDb)
    .filter((e) => !inLib.has(exKey(e.name)) && (cat === 'all' || e.cat === cat) && norm(e.name).includes(query))
    .slice(0, 60);
  const pickDb = (ex) => { addToLibrary(ex); onPick(ex); };

  const list = dbOnly ? [] : library
    .filter((e) => (cat === 'all' || e.cat === cat) && norm(e.name).includes(query))
    .sort((a, b) => a.name.localeCompare(b.name));
  const exact = library.some((e) => norm(e.name) === query) || dbList.some((e) => norm(e.name) === query);
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
          <h2>{dbOnly ? t('ex.browse') : t('pick.title')}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>{t('pick.close')}</button>
        </div>
        <input className="input" autoFocus placeholder={t('pick.search')} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="chips">
          {['all', ...CATEGORIES].map((c) => (
            <button key={c} className={'chip' + (cat === c ? ' is-on' : '')} onClick={() => setCat(c)}>{c === 'all' ? t('pick.all') : t('cat.' + c)}</button>
          ))}
        </div>
        <div className="sheet-list">
          {!dbOnly && wantDb && list.length > 0 && <p className="label pick-section">{t('pick.mine')}</p>}
          {list.map((e) => {
            const key = exKey(e.name);
            const pb = prs[key];
            return (
              <button key={e.name} className="pick" disabled={skip.has(key)} onClick={() => onPick(e)}>
                <span>{e.name}</span>
                <span className="pick-meta">
                  <span className="label">{skip.has(key) ? t('pick.inWorkout') : pb ? `PB ${pb.weight || 'BW'}×${pb.reps}` : t('cat.' + e.cat)}</span>
                  {!infoOf(e.name) && <span className="custom-tag">{t('info.custom')}</span>}
                  <TypeTag type={typeOf(e.name)} />
                </span>
              </button>
            );
          })}
          {!dbOnly && !wantDb && <p className="muted small pick-hint">{t('pick.dbHint')}</p>}
          {wantDb && (dbList.length > 0 || dbErr || !db) && <p className="label pick-section">{t('pick.db')}</p>}
          {wantDb && !db && !dbErr && <p className="empty">{t('hist.loading')}</p>}
          {dbErr && <p className="empty">{t('pick.dbFail')}</p>}
          {dbList.map((e) => (
            <button key={e.db} className="pick" onClick={() => pickDb(e)}>
              <span>{e.name}</span>
              <span className="pick-meta">
                <span className="label">{t('cat.' + e.cat)}</span>
                <TypeTag type={e.type || 'reps'} />
                <span className="add-chip">+ {t('pick.dbAdd')}</span>
              </span>
            </button>
          ))}
          {!dbOnly && !list.length && !query && <p className="empty">{t('pick.none')}</p>}
          {!dbOnly && query && !exact && (
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
