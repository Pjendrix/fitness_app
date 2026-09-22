import { useMemo, useRef, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { CATEGORIES, normCat } from '../data/exercises.js';
import { download, parseCsv, toCsv } from '../lib/csv.js';
import { exKey, fmtSet, LIMITS, sanitizeName } from '../lib/util.js';
import { t } from '../lib/i18n.js';
import ExercisePicker, { norm, TypeTag } from '../components/ExercisePicker.jsx';
import { PlusIcon, TrashIcon } from '../components/Icons.jsx';
import { InfoButton } from '../components/ExerciseInfo.jsx';
import { useDialog } from '../components/Dialog.jsx';

export default function Exercises() {
  const { library, saveLibrary, addToLibrary, prs, workouts, notify } = useStore();
  const [q, setQ] = useState('');
  const [name, setName] = useState('');
  const [cat, setCat] = useState(CATEGORIES[0]);
  const [type, setType] = useState('reps');
  const [browsing, setBrowsing] = useState(false);
  const file = useRef(null);
  const dialog = useDialog();

  const counts = useMemo(() => {
    const c = {};
    for (const w of workouts) for (const e of w.exercises) c[e.key] = (c[e.key] || 0) + 1;
    return c;
  }, [workouts]);

  const query = norm(q.trim());
  const groups = [...CATEGORIES, 'other']
    .map((c) => ({ c, items: library.filter((e) => e.cat === c && norm(e.name).includes(query)).sort((a, b) => a.name.localeCompare(b.name)) }))
    .filter((g) => g.items.length);

  const add = () => {
    const n = sanitizeName(name);
    if (!n) return;
    if (library.some((e) => exKey(e.name) === exKey(n))) return notify(t('ex.exists'));
    addToLibrary({ name: n, cat, type });
    setName('');
  };

  const exportCsv = () => download('forge-exercises.csv', toCsv([['name', 'category', 'type', 'db'], ...library.map((e) => [e.name, e.cat, e.type === 'time' ? 'time' : 'reps', e.db || ''])]));

  const importCsv = async (ev) => {
    const f = ev.target.files?.[0];
    ev.target.value = '';
    if (!f) return;
    const rows = parseCsv((await f.text()).replace(/^\ufeff/, ''));
    const head = rows[0]?.map((h) => h.toLowerCase());
    const body = head && head[0] === 'name' ? rows.slice(1) : rows;
    const seen = new Set();
    const list = body
      .filter((r) => sanitizeName(r[0]))
      .slice(0, LIMITS.library)
      .map((r) => { const cat = normCat(r[1]); const time = /^(time|cas|čas)$/i.test(r[2] || '') || (!r[2] && cat === 'cardio'); const db = r[3] ? { db: r[3] } : {}; const name = sanitizeName(r[0]); return time ? { name, cat, type: 'time', ...db } : { name, cat, ...db }; })
      .filter((e) => !seen.has(exKey(e.name)) && seen.add(exKey(e.name)));
    if (!list.length) return notify(t('ex.importFail'));
    const mode = await dialog.choose({
      title: t('ex.importTitle', { n: list.length }),
      message: t('ex.importMode'),
      actions: [{ value: 'merge', label: t('ex.importMerge'), primary: true }, { value: 'replace', label: t('ex.importReplace'), danger: true }, { value: null, label: t('dlg.cancel') }],
    });
    if (!mode) return;
    if (mode === 'replace') {
      saveLibrary(list);
    } else {
      const have = new Map(library.map((e) => [exKey(e.name), e]));
      for (const e of list) have.set(exKey(e.name), e);
      saveLibrary([...have.values()]);
    }
    notify(t('ex.imported', { n: list.length }));
  };

  const remove = async (e) => (await dialog.confirm(t('ex.confirmDelete', { name: e.name }), { danger: true, ok: t('ex.delete') })) && saveLibrary(library.filter((x) => x !== e));
  const recat = (e, c) => saveLibrary(library.map((x) => (x === e ? { ...x, cat: c } : x)));

  return (
    <div className="screen screen-wide">
      {browsing && <ExercisePicker mode="db" onClose={() => setBrowsing(false)} onPick={(ex) => notify(t('ex.added', { name: ex.name }))} />}
      <header className="screen-head row-between">
        <div><h1>{t('ex.title')}</h1><p className="label" style={{ marginTop: 6 }}>{t('ex.count', { n: library.length })}</p></div>
        <div className="row-actions">
          <button className="btn btn-primary btn-sm" onClick={() => setBrowsing(true)}>{t('ex.browse')}</button>
          <button className="btn btn-ghost btn-sm" onClick={exportCsv}>{t('ex.export')}</button>
          <button className="btn btn-ghost btn-sm" onClick={() => file.current?.click()}>{t('ex.import')}</button>
          <input ref={file} type="file" accept=".csv,text/csv" hidden onChange={importCsv} />
        </div>
      </header>

      <p className="label" style={{ margin: '6px 0 -4px' }}>{t('ex.customTitle')}</p>
      <div className="card ex-add">
        <input className="input" maxLength={80} placeholder={t('ex.namePh')} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <select className="input" value={cat} onChange={(e) => { setCat(e.target.value); if (e.target.value === 'cardio') setType('time'); }} aria-label={t('pick.category')}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{t('cat.' + c)}</option>)}
        </select>
        <select className="input" value={type} onChange={(e) => setType(e.target.value)} aria-label={t('type.label')}>
          <option value="reps">{t('type.repsLong')}</option>
          <option value="time">{t('type.timeLong')}</option>
        </select>
        <button className="btn btn-primary" onClick={add}><PlusIcon width={16} height={16} /> {t('ex.add')}</button>
      </div>

      <input className="input" placeholder={t('ex.search')} value={q} onChange={(e) => setQ(e.target.value)} />

      <div className="ex-columns">
        {groups.map(({ c, items }) => (
          <section className="card ex-group" key={c}>
            <div className="card-head"><h2>{t('cat.' + c)}</h2><span className="label">{items.length}</span></div>
            {items.map((e) => {
              const k = exKey(e.name);
              return (
                <div className="lib-row" key={e.name}>
                  <div className="lib-main">
                    <span>{e.name} <InfoButton name={e.name} /> <button className="type-toggle" title={t('type.label')} onClick={() => saveLibrary(library.map((x) => (x === e ? (e.type === 'time' ? (({ type: _type, ...rest }) => rest)(x) : { ...x, type: 'time' }) : x)))}><TypeTag type={e.type} /></button></span>
                    <span className="label">{[prs[k] && `PB ${fmtSet(prs[k].weight, prs[k].reps, prs[k].time)}`, counts[k] && t('ex.sessions', { n: counts[k] })].filter(Boolean).join(' · ')}</span>
                  </div>
                  <select className="lib-cat" value={e.cat} onChange={(ev) => recat(e, ev.target.value)} aria-label={t('pick.category')}>
                    {[...CATEGORIES, 'other'].map((x) => <option key={x} value={x}>{t('cat.' + x)}</option>)}
                  </select>
                  <button className="icon-btn danger" aria-label={t('ex.delete')} onClick={() => remove(e)}><TrashIcon width={16} height={16} /></button>
                </div>
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}
