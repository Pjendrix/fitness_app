import { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { GROUP_ORDER, GROUPS } from '../data/defaultTemplates.js';
import { exKey, planLabel, uid } from '../lib/util.js';
import { ChevronIcon, PlusIcon, TrashIcon, XIcon } from '../components/Icons.jsx';
import ExercisePicker from '../components/ExercisePicker.jsx';

function TemplateCard({ tpl, onStart, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={'card tpl' + (tpl.variant === 'Hardcore' ? ' is-hard' : '')}>
      <button className="tpl-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <div>
          <h3>{tpl.variant || tpl.name}</h3>
          <p className="label">{tpl.exercises.length} cvičení · {tpl.exercises.reduce((s, e) => s + e.sets, 0)} sérií</p>
        </div>
        <ChevronIcon className={'chev' + (open ? ' is-open' : '')} />
      </button>
      {open && (
        <ol className="tpl-list">
          {tpl.exercises.map((e, i) => (
            <li key={i}>
              <span>{e.name}</span>
              <span className="muted small">{[planLabel(e), e.hint, e.plan && e.plan.map((p) => `${p.w}×${p.r}`).join(', '), e.note].filter(Boolean).join(' · ')}</span>
            </li>
          ))}
        </ol>
      )}
      <div className="tpl-actions">
        <button className="btn btn-primary btn-sm" onClick={() => onStart(tpl)}>Spustit</button>
        <button className="btn btn-ghost btn-sm" onClick={() => onEdit(tpl)}>{tpl.builtin ? 'Upravit kopii' : 'Upravit'}</button>
        {onDelete && <button className="icon-btn danger" aria-label="Smazat šablonu" onClick={() => window.confirm('Smazat šablonu?') && onDelete(tpl.id)}><TrashIcon width={17} height={17} /></button>}
      </div>
    </div>
  );
}

// Opakování: číslo, rozsah (8-10) nebo „max“. Text patří do poznámky.
const cleanReps = (v) => {
  const t = v.toLowerCase().replace(/\s/g, '').replace(/[–—]/g, '-');
  if ('max'.startsWith(t) && t) return t;
  return t.replace(/[^0-9-]/g, '').replace(/-+/g, '-').replace(/^-/, '').slice(0, 5);
};

function Editor({ initial, onSave, onClose }) {
  const [name, setName] = useState(initial.name);
  const [items, setItems] = useState(initial.exercises);
  const [picking, setPicking] = useState(false);
  const upd = (i, patch) => setItems((l) => l.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <div className="card form">
      <input className="input" placeholder="Název šablony" value={name} onChange={(e) => setName(e.target.value)} />
      {items.map((e, i) => (
        <div className="edit-ex" key={i}>
          <div className="edit-ex-name">{e.name}</div>
          <label className="mini"><span className="label">Série</span><input className="input" inputMode="numeric" value={e.sets} onChange={(ev) => upd(i, { sets: Math.max(1, Math.min(20, +ev.target.value || 1)) })} /></label>
          <label className="mini"><span className="label">Opak.</span><input className="input" inputMode="text" value={e.reps} placeholder="8-10" onChange={(ev) => upd(i, { reps: cleanReps(ev.target.value) })} /></label>
          <label className="mini"><span className="label">kg</span><input className="input" inputMode="decimal" value={e.weight ?? ''} placeholder="–" onChange={(ev) => upd(i, { weight: ev.target.value })} /></label>
          <button className="icon-btn" aria-label="Odebrat" onClick={() => setItems((l) => l.filter((_, j) => j !== i))}><XIcon width={16} height={16} /></button>
          <input className="input edit-note" value={e.note || ''} placeholder="Poznámka (např. drop-set, do selhání)" onChange={(ev) => upd(i, { note: ev.target.value })} />
        </div>
      ))}
      <button className="btn btn-ghost btn-sm" onClick={() => setPicking(true)}><PlusIcon width={16} height={16} /> Přidat cvičení</button>
      <div className="row-actions">
        <button className="btn btn-primary btn-sm" onClick={() => onSave({ ...initial, name: name.trim(), exercises: items })} disabled={!name.trim() || !items.length}>Uložit šablonu</button>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Zrušit</button>
      </div>
      {picking && (
        <ExercisePicker
          exclude={items.map((x) => exKey(x.name))}
          onClose={() => setPicking(false)}
          onPick={(ex) => { setItems((l) => [...l, { name: ex.name, sets: 3, reps: '8-10', weight: '', hint: '', note: '' }]); setPicking(false); }}
        />
      )}
    </div>
  );
}

export default function Templates({ go }) {
  const { templates, active, startWorkout, saveTemplate, deleteTemplate } = useStore();
  const [editing, setEditing] = useState(null);

  const start = (tpl) => {
    if (active && !window.confirm('Rozdělaný trénink bude nahrazen. Pokračovat?')) return;
    startWorkout(tpl);
    go('workout');
  };
  const edit = (tpl) => {
    setEditing(tpl.builtin
      ? { ...tpl, id: uid(), builtin: false, name: `${tpl.name} (moje)`, group: tpl.group, variant: '' }
      : tpl);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };
  const save = (tpl) => {
    saveTemplate({ ...tpl, exercises: tpl.exercises.map((e) => ({ ...e, weight: e.weight === '' ? '' : Number(String(e.weight).replace(',', '.')) || '' })) });
    setEditing(null);
  };

  const mine = templates.filter((t) => !t.builtin);

  return (
    <div className="screen">
      <header className="screen-head"><h1>Šablony</h1></header>

      <div className="tpl-columns">
        {GROUP_ORDER.map((g) => (
          <section key={g}>
            <div className="group-head"><h2>{GROUPS[g].label}</h2><span className="muted small">{GROUPS[g].sub}</span></div>
            <div className="tpl-grid">
              {templates.filter((t) => t.builtin && t.group === g).map((t) => <TemplateCard key={t.id} tpl={t} onStart={start} onEdit={edit} />)}
            </div>
          </section>
        ))}
      </div>

      <section>
        <div className="group-head"><h2>Moje šablony</h2></div>
        <div className="tpl-grid">
          {mine.map((t) => <TemplateCard key={t.id} tpl={t} onStart={start} onEdit={edit} onDelete={deleteTemplate} />)}
        </div>
        {editing ? (
          <Editor key={editing.id} initial={editing} onSave={save} onClose={() => setEditing(null)} />
        ) : (
          <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={() => setEditing({ id: uid(), name: '', group: '', variant: '', exercises: [] })}>
            <PlusIcon width={16} height={16} /> Nová šablona
          </button>
        )}
      </section>
    </div>
  );
}
