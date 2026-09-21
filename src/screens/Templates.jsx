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

function Stepper({ value, min, max, onChange }) {
  const set = (v) => onChange(Math.max(min, Math.min(max, v)));
  return (
    <div className="stepper">
      <button type="button" aria-label="Méně" disabled={value <= min} onClick={() => set(value - 1)}>−</button>
      <span className="stepper-val">{value}</span>
      <button type="button" aria-label="Více" disabled={value >= max} onClick={() => set(value + 1)}>+</button>
    </div>
  );
}

function Editor({ initial, onSave, onClose }) {
  const [name, setName] = useState(initial.name);
  const [items, setItems] = useState(() =>
    initial.exercises.map((e) => ({ ...e, reps: e.reps === 'max' ? 'max' : String(parseInt(e.reps, 10) || 8) }))
  );
  const [picking, setPicking] = useState(false);
  const upd = (i, patch) => setItems((l) => l.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <div className="card form">
      <input className="input" placeholder="Název šablony" value={name} onChange={(e) => setName(e.target.value)} />
      {items.map((e, i) => (
        <div className="edit-ex" key={i}>
          <div className="edit-ex-name">{e.name}</div>
          <div className="mini"><span className="label">Série</span><Stepper value={e.sets} min={1} max={20} onChange={(v) => upd(i, { sets: v })} /></div>
          <div className="mini">
            <span className="label reps-label">Opak.
              <button type="button" className={'max-chip' + (e.reps === 'max' ? ' is-on' : '')} onClick={() => upd(i, { reps: e.reps === 'max' ? '8' : 'max' })}>max</button>
            </span>
            {e.reps === 'max'
              ? <div className="stepper stepper-max">do selhání</div>
              : <Stepper value={parseInt(e.reps, 10) || 8} min={1} max={50} onChange={(v) => upd(i, { reps: String(v) })} />}
          </div>
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
          onPick={(ex) => { setItems((l) => [...l, { name: ex.name, sets: 3, reps: '8', weight: '', hint: '', note: '' }]); setPicking(false); }}
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
