import { useEffect, useMemo, useState } from 'react';
import Sheet from './Sheet.jsx';
import { fromDb, loadDb } from '../lib/exerciseDb.js';
import { CATEGORIES } from '../data/exercises.js';
import { alternativesFor } from '../data/alternatives.js';
import { useStore } from '../lib/store.jsx';
import { exKey, sanitizeName } from '../lib/util.js';
import { t } from '../lib/i18n.js';
import { PlusIcon } from './Icons.jsx';

export const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Bottom sheet: search + muscle-group filter. Can create a new exercise (saved to the library).
// Small tag: weight × reps vs. timed
export function TypeTag({ type }) {
  return <span className={'type-tag' + (type === 'time' ? ' is-time' : '')}>{type === 'time' ? '⏱ ' + t('type.time') : t('type.reps')}</span>;
}

// mode 'db' = browse the exercise database only (Exercises tab)
// replacing = exercise being swapped in the active workout → suggestions first, then the usual search
export default function ExercisePicker({ onPick, onClose, exclude = [], mode, replacing }) {
  const { library, addToLibrary, prs, typeOf, infoOf, catOf } = useStore();
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
  const inLib = useMemo(() => new Set(library.map((e) => exKey(e.name))), [library]);
  const dbMapped = useMemo(() => (db ? db.map((x) => ({ ...fromDb(x), n: norm(x.name) })) : []), [db]);
  const dbList = !wantDb ? [] : dbMapped
    .filter((e) => !inLib.has(exKey(e.name)) && (cat === 'all' || e.cat === cat) && e.n.includes(query))
    .slice(0, 60);
  const pickDb = ({ n, ...ex }) => { void n; addToLibrary(ex); onPick(ex); };

  const list = dbOnly ? [] : library
    .filter((e) => (cat === 'all' || e.cat === cat) && norm(e.name).includes(query))
    .sort((a, b) => a.name.localeCompare(b.name));
  const exact = library.some((e) => norm(e.name) === query) || dbList.some((e) => e.n === query);
  const skip = new Set(exclude);
  const alts = useMemo(
    () => (replacing ? alternativesFor(replacing.name, { library, catOf, prs, exclude }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [replacing, library, catOf, prs],
  );
  const showAlts = alts && !query && cat === 'all' && (alts.similar.length > 0 || alts.sameCat.length > 0);

  const row = (e, keyPrefix = '') => {
    const key = exKey(e.name);
    const pb = prs[key];
    return (
      <button key={keyPrefix + e.name} className="pick" disabled={skip.has(key)} onClick={() => onPick(e)}>
        <span>{e.name}</span>
        <span className="pick-meta">
          <span className="label">{skip.has(key) ? t('pick.inWorkout') : pb ? `${t('rec.max')} ${pb.weight || 'BW'}×${pb.reps}` : t('cat.' + e.cat)}</span>
          {!infoOf(e.name) && <span className="custom-tag">{t('info.custom')}</span>}
          <TypeTag type={typeOf(e.name)} />
        </span>
      </button>
    );
  };
  const title = replacing ? t('rep.title') : dbOnly ? t('ex.browse') : t('pick.title');

  const createCustom = () => {
    const name = sanitizeName(q);
    if (!name) return;
    const ex = { name, cat: newCat, type: newType };
    addToLibrary(ex);
    onPick(ex);
  };

  return (
    <Sheet label={title} onClose={onClose}>
        <div className="sheet-head">
          <div>
            <h2>{title}</h2>
            {replacing && <p className="muted small rep-of">{replacing.name}</p>}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>{t('pick.close')}</button>
        </div>
        {/* Při nahrazování bez autofocusu – klávesnice by zakryla návrhy */}
        <input className="input" autoFocus={!replacing} maxLength={80} type="search" aria-label={t('pick.search')} placeholder={t('pick.search')} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="chips">
          {['all', ...CATEGORIES].map((c) => (
            <button key={c} className={'chip' + (cat === c ? ' is-on' : '')} onClick={() => setCat(c)}>{c === 'all' ? t('pick.all') : t('cat.' + c)}</button>
          ))}
        </div>
        <div className="sheet-list">
          {showAlts && alts.similar.length > 0 && <p className="label pick-section">{t('rep.similar')}</p>}
          {showAlts && alts.similar.map((e) => row(e, 'alt:'))}
          {showAlts && alts.sameCat.length > 0 && <p className="label pick-section">{t('rep.sameCat', { cat: t('cat.' + catOf(replacing.name)) })}</p>}
          {showAlts && alts.sameCat.map((e) => row(e, 'cat:'))}
          {((!dbOnly && wantDb && list.length > 0) || (showAlts && list.length > 0)) && <p className="label pick-section">{showAlts ? t('rep.all') : t('pick.mine')}</p>}
          {list.map((e) => row(e))}
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
    </Sheet>
  );
}
