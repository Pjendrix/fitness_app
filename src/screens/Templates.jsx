import { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { colorHex, TEMPLATE_COLORS } from '../data/defaultTemplates.js';
import { exKey, planLabel, uid } from '../lib/util.js';
import { t } from '../lib/i18n.js';
import { ChevronIcon, PlusIcon, TrashIcon, XIcon } from '../components/Icons.jsx';
import ExercisePicker from '../components/ExercisePicker.jsx';

const setCount = (tpl) => tpl.exercises.reduce((s, e) => s + e.sets, 0);

function TemplateCard({ tpl, onStart, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const color = colorHex(tpl.color);
  return (
    <div className={'card tpl tinted' + (tpl.variant === 'Hardcore' ? ' is-hard' : '')} style={color ? { '--tint': color } : undefined}>
      <button className="tpl-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <div>
          <h3>{tpl.builtin && ['Normal', 'Hardcore'].includes(tpl.variant) ? tpl.variant : tpl.name}</h3>
          <p className="label">{t('count.exercises', { n: tpl.exercises.length })} · {t('count.sets', { n: setCount(tpl) })}</p>
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
        <button className="btn btn-primary btn-sm" onClick={() => onStart(tpl)}>{t('tpl.start')}</button>
        <button className="btn btn-ghost btn-sm" onClick={() => onEdit(tpl)}>{tpl.builtin ? t('tpl.editCopy') : t('tpl.edit')}</button>
        {onDelete && <button className="icon-btn danger" aria-label={t('tpl.delete')} onClick={() => window.confirm(t('tpl.confirmDelete')) && onDelete(tpl.id)}><TrashIcon width={17} height={17} /></button>}
      </div>
    </div>
  );
}

function Stepper({ value, min, max, onChange }) {
  const set = (v) => onChange(Math.max(min, Math.min(max, v)));
  return (
    <div className="stepper">
      <button type="button" aria-label={t('tpl.less')} disabled={value <= min} onClick={() => set(value - 1)}>−</button>
      <span className="stepper-val">{value}</span>
      <button type="button" aria-label={t('tpl.more')} disabled={value >= max} onClick={() => set(value + 1)}>+</button>
    </div>
  );
}

function ColorPicker({ value, onChange }) {
  return (
    <div className="swatches" role="radiogroup" aria-label={t('tpl.color')}>
      <button type="button" role="radio" aria-checked={!value} aria-label={t('tpl.noColor')} className={'swatch swatch-none' + (!value ? ' is-on' : '')} onClick={() => onChange('')} />
      {TEMPLATE_COLORS.map((c) => (
        <button key={c.id} type="button" role="radio" aria-checked={value === c.id} aria-label={c.id} title={c.id}
          className={'swatch' + (value === c.id ? ' is-on' : '')} style={{ '--sw': c.hex }} onClick={() => onChange(c.id)} />
      ))}
    </div>
  );
}

function Editor({ initial, onSave, onClose, typeOf }) {
  const [name, setName] = useState(initial.name);
  const [color, setColor] = useState(initial.color || '');
  const [items, setItems] = useState(() =>
    initial.exercises.map((e) => ({ ...e, type: e.type || typeOf(e.name), reps: e.reps === 'max' ? 'max' : String(parseInt(e.reps, 10) || 8), time: e.time || e.plan?.[0]?.t || 1 }))
  );
  const [picking, setPicking] = useState(false);
  const upd = (i, patch) => setItems((l) => l.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const hex = colorHex(color);

  return (
    <div className="card form tinted" style={hex ? { '--tint': hex } : undefined}>
      <div className="editor-top">
        <input className="input" placeholder={t('tpl.name')} value={name} onChange={(e) => setName(e.target.value)} />
        <div className="editor-color"><span className="label">{t('tpl.color')}</span><ColorPicker value={color} onChange={setColor} /></div>
      </div>
      {items.map((e, i) => (
        <div className="edit-ex" key={i}>
          <div className="edit-ex-name">{e.name}</div>
          <div className="mini"><span className="label">{t('tpl.sets')}</span><Stepper value={e.sets} min={1} max={20} onChange={(v) => upd(i, { sets: v })} /></div>
          {e.type === 'time' ? (
            <div className="mini"><span className="label">{t('tpl.min')}</span><Stepper value={e.time} min={1} max={120} onChange={(v) => upd(i, { time: v, plan: undefined })} /></div>
          ) : (
          <div className="mini">
            <span className="label reps-label">{t('tpl.reps')}
              <button type="button" className={'max-chip' + (e.reps === 'max' ? ' is-on' : '')} onClick={() => upd(i, { reps: e.reps === 'max' ? '8' : 'max' })}>{t('tpl.max')}</button>
            </span>
            {e.reps === 'max'
              ? <div className="stepper stepper-max">{t('tpl.toFailure')}</div>
              : <Stepper value={parseInt(e.reps, 10) || 8} min={1} max={50} onChange={(v) => upd(i, { reps: String(v) })} />}
          </div>
          )}
          <label className="mini"><span className="label">{t('tpl.kg')}</span><input className="input" inputMode="decimal" value={e.weight ?? ''} placeholder="–" onChange={(ev) => upd(i, { weight: ev.target.value })} /></label>
          <button className="icon-btn" aria-label={t('tpl.remove')} onClick={() => setItems((l) => l.filter((_, j) => j !== i))}><XIcon width={16} height={16} /></button>
          <input className="input edit-note" value={e.note || ''} placeholder={t('tpl.note')} onChange={(ev) => upd(i, { note: ev.target.value })} />
        </div>
      ))}
      <button className="btn btn-ghost btn-sm" onClick={() => setPicking(true)}><PlusIcon width={16} height={16} /> {t('wo.addEx')}</button>
      <div className="row-actions">
        <button className="btn btn-primary btn-sm" onClick={() => onSave({ ...initial, name: name.trim(), color, exercises: items })} disabled={!name.trim() || !items.length}>{t('tpl.save')}</button>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>{t('tpl.cancel')}</button>
      </div>
      {picking && (
        <ExercisePicker
          exclude={items.map((x) => exKey(x.name))}
          onClose={() => setPicking(false)}
          onPick={(ex) => { const type = ex.type || typeOf(ex.name); setItems((l) => [...l, { name: ex.name, type, sets: type === 'time' ? 1 : 3, reps: '8', time: 10, weight: '', hint: '', note: '' }]); setPicking(false); }}
        />
      )}
    </div>
  );
}

export default function Templates({ go }) {
  const { templates, active, startWorkout, saveTemplate, deleteTemplate, prof, typeOf } = useStore();
  const [editing, setEditing] = useState(null);

  const start = (tpl) => {
    if (active && !window.confirm(t('wo.replace'))) return;
    startWorkout(tpl);
    go('workout');
  };
  const edit = (tpl) => {
    setEditing(tpl.builtin ? { ...tpl, id: uid(), builtin: false, name: `${tpl.name} ${t('tpl.copySuffix')}`, variant: '' } : tpl);
    setTimeout(() => document.querySelector('.editor-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };
  const save = (tpl) => {
    saveTemplate({ ...tpl, exercises: tpl.exercises.map((e) => ({ ...e, weight: e.weight === '' ? '' : Number(String(e.weight).replace(',', '.')) || '' })) });
    setEditing(null);
  };

  const mine = templates.filter((x) => !x.builtin);

  return (
    <div className="screen">
      <header className="screen-head"><h1>{t('tpl.title')}</h1></header>

      <div className="tpl-columns">
        {prof.groups.map((g) => (
          <section key={g}>
            <div className="group-head"><h2>{g}</h2><span className="muted small">{t('groups.' + g)}</span></div>
            <div className="tpl-grid">
              {templates.filter((x) => x.builtin && x.group === g).map((x) => <TemplateCard key={x.id} tpl={x} onStart={start} onEdit={edit} />)}
            </div>
          </section>
        ))}
      </div>

      <section>
        <div className="group-head"><h2>{t('tpl.mine')}</h2></div>
        <div className="tpl-grid tpl-mine">
          {mine.map((x) => <TemplateCard key={x.id} tpl={x} onStart={start} onEdit={edit} onDelete={deleteTemplate} />)}
        </div>
        <div className="editor-anchor" />
        {editing ? (
          <Editor key={editing.id} initial={editing} onSave={save} onClose={() => setEditing(null)} typeOf={typeOf} />
        ) : (
          <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={() => setEditing({ id: uid(), name: '', color: '', group: '', variant: '', exercises: [] })}>
            <PlusIcon width={16} height={16} /> {t('tpl.new')}
          </button>
        )}
      </section>
    </div>
  );
}
