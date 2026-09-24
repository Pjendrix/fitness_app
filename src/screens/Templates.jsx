import { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { colorHex, TEMPLATE_COLORS } from '../data/defaultTemplates.js';
import { DECIMAL_INPUT, exKey, LIMITS, planLabel, sanitizeName, uid } from '../lib/util.js';
import { t } from '../lib/i18n.js';
import { ArrowDownIcon, ArrowUpIcon, ChevronIcon, CopyIcon, LinkIcon, PencilIcon, PlusIcon, TrashIcon, XIcon } from '../components/Icons.jsx';
import Sheet from '../components/Sheet.jsx';
import ExercisePicker from '../components/ExercisePicker.jsx';
import { InfoButton } from '../components/ExerciseInfo.jsx';
import { useDialog } from '../components/Dialog.jsx';

const setCount = (tpl) => tpl.exercises.reduce((s, e) => s + e.sets, 0);

function TemplateCard({ tpl, onStart, onEdit, onDelete, onDuplicate }) {
  const [open, setOpen] = useState(false);
  const dialog = useDialog();
  const color = colorHex(tpl.color);
  return (
    <div className="card tpl tinted" style={color ? { '--tint': color } : undefined}>
      <button className="tpl-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <div>
          <h3>{tpl.name}</h3>
          <p className="label">{t('count.exercises', { n: tpl.exercises.length })} · {t('count.sets', { n: setCount(tpl) })}</p>
        </div>
        <ChevronIcon className={'chev' + (open ? ' is-open' : '')} />
      </button>
      {open && (
        <ol className="tpl-list">
          {tpl.exercises.map((e, i) => (
            <li key={i}>
              <span>{e.name} <InfoButton name={e.name} />{e.ss && tpl.exercises[i + 1]?.ss === e.ss ? <span className="ss-mini">{t('ss.short')}</span> : null}</span>
              <span className="muted small">{[planLabel(e), e.hint, e.plan && e.plan.map((p) => `${p.w}×${p.r}`).join(', '), e.note].filter(Boolean).join(' · ')}</span>
            </li>
          ))}
        </ol>
      )}
      <div className="tpl-actions">
        <button className="btn btn-primary btn-sm" onClick={() => onStart(tpl)}>{t('tpl.start')}</button>
        <button className="btn btn-ghost btn-sm" onClick={() => onEdit(tpl)}>{t('tpl.edit')}</button>
        {onDuplicate && <button className="icon-btn" aria-label={t('tpl.duplicate')} title={t('tpl.duplicate')} onClick={() => onDuplicate(tpl)}><CopyIcon width={16} height={16} /></button>}
        {onDelete && <button className="icon-btn danger" aria-label={t('tpl.delete')} onClick={async () => (await dialog.confirm(t('tpl.confirmDelete'), { danger: true, ok: t('tpl.delete') })) && onDelete(tpl.id)}><TrashIcon width={17} height={17} /></button>}
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

function Editor({ initial, onSave, onClose, typeOf, isMain, groupLabel }) {
  const [name, setName] = useState(initial.name);
  const [variant, setVariant] = useState(initial.variant || '');
  const [color, setColor] = useState(initial.color || '');
  const [items, setItems] = useState(() =>
    initial.exercises.map((e, i, all) => ({
      ...e, type: e.type || typeOf(e.name), reps: e.reps === 'max' ? 'max' : String(parseInt(e.reps, 10) || 8), time: e.time || e.plan?.[0]?.t || 1,
      ssNext: Boolean(e.ss && all[i + 1]?.ss === e.ss), _id: uid(),
    }))
  );
  const [picking, setPicking] = useState(false);
  const upd = (i, patch) => setItems((l) => l.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  // T2: změna sérií/opakování/váhy nahradí plán po sériích (jinak by plán v tréninku úpravu přebil)
  const updPlan = (i, patch) => upd(i, { ...patch, plan: undefined });
  // T1: pořadí; propojení supersetu kolem přesunutých cviků se zruší
  const move = (i, d) => setItems((l) => {
    const j = i + d;
    if (j < 0 || j >= l.length) return l;
    const n = l.map((x, k) => (k >= Math.min(i, j) - 1 && k <= Math.max(i, j) ? { ...x, ssNext: false } : x));
    [n[i], n[j]] = [n[j], n[i]];
    return n;
  });
  // Uložení: řetězce ssNext → společné id supersetu
  const withSs = (list) => {
    let id = '';
    return list.map((x, i) => {
      const linkedPrev = i > 0 && list[i - 1].ssNext;
      if (!linkedPrev) id = x.ssNext ? uid().slice(0, 6) : '';
      const { ssNext, _id, ...rest } = x;
      void ssNext; void _id;
      return { ...rest, ss: linkedPrev || x.ssNext ? id : '' };
    });
  };
  const hex = colorHex(color);

  return (
    <Sheet label={isMain ? `${groupLabel} ${variant}` : name || t('tpl.new')} onClose={onClose} className={'sheet-full tpl-sheet' + (hex ? ' tinted' : '')}>
      <div className="sheet-head"><h2>{isMain ? `${groupLabel} ${variant}`.trim() : name || t('tpl.new')}</h2><button className="btn btn-ghost btn-sm" onClick={onClose}>{t('tpl.cancel')}</button></div>
      <div className="form" style={hex ? { '--tint': hex } : undefined}>
      <div className="editor-top">
        <div className="editor-names">
          {isMain ? (
            <label className="mini variant-field">
              <span className="label">{t('tpl.variant')}</span>
              <span className="variant-input"><span className="group-fixed">{groupLabel}</span><input className="input" autoFocus maxLength={40} value={variant} placeholder="A" onChange={(e) => setVariant(e.target.value)} /></span>
            </label>
          ) : (
            <input className="input" maxLength={80} placeholder={t('tpl.name')} value={name} onChange={(e) => setName(e.target.value)} />
          )}
        </div>
        <div className="editor-color"><span className="label">{t('tpl.color')}</span><ColorPicker value={color} onChange={setColor} /></div>
      </div>
      {items.map((e, i) => (
        <div key={e._id} className="edit-ex-wrap">
        <div className="edit-ex">
          <div className="edit-ex-name">
            <span className="edit-order">
              <button type="button" className="icon-btn" aria-label={t('wo.up')} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUpIcon width={16} height={16} /></button>
              <button type="button" className="icon-btn" aria-label={t('wo.down')} disabled={i === items.length - 1} onClick={() => move(i, 1)}><ArrowDownIcon width={16} height={16} /></button>
            </span>
            {e.name}
          </div>
          <div className="mini"><span className="label">{t('tpl.sets')}</span><Stepper value={e.sets} min={1} max={20} onChange={(v) => updPlan(i, { sets: v })} /></div>
          {e.type === 'time' ? (
            <div className="mini"><span className="label">{t('tpl.min')}</span><Stepper value={e.time} min={1} max={120} onChange={(v) => upd(i, { time: v, plan: undefined })} /></div>
          ) : (
          <div className="mini">
            <span className="label reps-label">{t('tpl.reps')}
              <button type="button" className={'max-chip' + (e.reps === 'max' ? ' is-on' : '')} onClick={() => updPlan(i, { reps: e.reps === 'max' ? '8' : 'max' })}>{t('tpl.max')}</button>
            </span>
            {e.reps === 'max'
              ? <div className="stepper stepper-max">{t('tpl.toFailure')}</div>
              : <Stepper value={parseInt(e.reps, 10) || 8} min={1} max={50} onChange={(v) => updPlan(i, { reps: String(v) })} />}
          </div>
          )}
          <label className="mini"><span className="label">{t('tpl.kg')}</span><input className="input" inputMode="decimal" value={e.weight ?? ''} placeholder="–" onChange={(ev) => { const v = ev.target.value; if (v === '' || DECIMAL_INPUT.test(v)) updPlan(i, { weight: v }); }} /></label>
          <button className="icon-btn" aria-label={t('tpl.remove')} onClick={() => setItems((l) => l.filter((_, j) => j !== i))}><XIcon width={16} height={16} /></button>
          <input className="input edit-note" maxLength={120} value={e.note || ''} placeholder={t('tpl.note')} onChange={(ev) => upd(i, { note: ev.target.value })} />
          {e.plan?.length > 0 && <p className="muted small edit-plan">{t('tpl.planIs', { p: e.plan.map((p) => (p.t ? `${p.w || 0}×${p.t} min` : `${p.w}×${p.r}`)).join(', ') })}</p>}
        </div>
        {i < items.length - 1 && (
          <button type="button" className={'ss-toggle' + (e.ssNext ? ' is-on' : '')} aria-pressed={e.ssNext} onClick={() => upd(i, { ssNext: !e.ssNext })}>
            <LinkIcon width={14} height={14} /> {e.ssNext ? t('ss.linked') : t('ss.linkNext')}
          </button>
        )}
        </div>
      ))}
      <button className="btn btn-ghost btn-sm" onClick={() => setPicking(true)}><PlusIcon width={16} height={16} /> {t('wo.addEx')}</button>
      <div className="row-actions sheet-foot">
        <button className="btn btn-primary btn-sm" onClick={() => onSave({ ...initial, ...(isMain ? { variant: variant.trim() || 'A' } : { name: name.trim() }), color, exercises: withSs(items) })} disabled={(isMain ? !variant.trim() : !name.trim()) || !items.length}>{t('tpl.save')}</button>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>{t('tpl.cancel')}</button>
      </div>
      {picking && (
        <ExercisePicker
          exclude={items.map((x) => exKey(x.name))}
          onClose={() => setPicking(false)}
          onPick={(ex) => { const type = ex.type || typeOf(ex.name); setItems((l) => [...l, { name: ex.name, type, sets: type === 'time' ? 1 : 3, reps: '8', time: 10, weight: '', hint: '', note: '', _id: uid(), ssNext: false }]); setPicking(false); }}
        />
      )}
      </div>
    </Sheet>
  );
}

export default function Templates({ go }) {
  const dialog = useDialog();
  const { templates, live, startWorkout, saveTemplate, deleteTemplate, typeOf, main, groupSub, groupLabel, saveMainTemplate, deleteMainTemplate, renameGroup, notify } = useStore();
  const [editing, setEditing] = useState(null); // {tpl, main: bool}
  // T5: sbalené skupiny (pamatuje si prohlížeč)
  const [collapsed, setCollapsed] = useState(() => { try { return JSON.parse(localStorage.getItem('forge:tplCollapsed')) || []; } catch { return []; } });
  const toggleGroup = (id) => setCollapsed((c) => {
    const n = c.includes(id) ? c.filter((x) => x !== id) : [...c, id];
    try { localStorage.setItem('forge:tplCollapsed', JSON.stringify(n)); } catch { /* ignore */ }
    return n;
  });

  const start = async (tpl) => {
    if (live && !(await dialog.confirm(t('wo.replace'), { danger: true, ok: t('tpl.start') }))) return;
    startWorkout(tpl);
    go('workout');
  };
  const openEditor = (tpl, isMain) => {
    setEditing({ tpl, main: isMain });
  };
  const normalise = (tpl) => ({
    ...tpl,
    ...(tpl.name != null ? { name: sanitizeName(tpl.name) } : {}),
    ...(tpl.variant != null ? { variant: sanitizeName(tpl.variant, LIMITS.variant) } : {}),
    exercises: tpl.exercises.slice(0, LIMITS.exercises).map((e) => ({
      ...e,
      note: sanitizeName(e.note || '', 120),
      weight: e.weight === '' || e.weight == null ? '' : Math.min(LIMITS.weight, Math.max(0, Number(String(e.weight).replace(',', '.')) || 0)) || '',
    })),
  });
  const save = (tpl) => {
    if (editing.main) { const { builtin, name, ...rest } = normalise(tpl); saveMainTemplate(rest); }
    else saveTemplate(normalise(tpl));
    setEditing(null);
  };
  const duplicate = (tpl) => {
    const { builtin, group, variant, ...rest } = tpl;
    openEditor({ ...rest, id: uid(), name: `${tpl.name} ${t('tpl.copySuffix')}`, group: '', variant: '' }, false);
  };
  const addVariant = (g) => {
    const inGroup = main.templates.filter((x) => x.group === g.id);
    const letters = 'ABCDEFGH';
    const variant = [...letters].find((l) => !inGroup.some((x) => x.variant === l)) || String(inGroup.length + 1);
    openEditor({ id: `m-${uid()}`, group: g.id, variant, color: '', exercises: [] }, true);
  };
  const rename = async (g) => {
    const v = await dialog.form({
      title: t('tpl.renameGroup'),
      fields: [
        { name: 'label', label: t('tpl.groupName'), value: g.label, maxLength: 20, required: true },
        { name: 'sub', label: t('tpl.groupSub'), value: g.sub || groupSub(g.id), maxLength: 80 },
      ],
    });
    if (!v) return;
    renameGroup(g.id, v.label.trim().toUpperCase(), v.sub.trim());
  };
  const removeMain = (tpl) => {
    if (main.templates.filter((x) => x.group === tpl.group).length <= 1) return notify(t('tpl.lastInGroup'));
    deleteMainTemplate(tpl.id);
  };

  const mine = templates.filter((x) => !x.builtin);
  const editor = (isMain) => editing && editing.main === isMain && (
    <Editor key={editing.tpl.id} initial={editing.tpl} isMain={isMain} groupLabel={isMain ? groupLabel(editing.tpl.group) : ''} onSave={save} onClose={() => setEditing(null)} typeOf={typeOf} />
  );

  return (
    <div className="screen">
      <header className="screen-head"><h1>{t('tpl.title')}</h1></header>

      <h2 className="tpl-section">{t('tpl.main')}</h2>
      <p className="muted small tpl-explain">{t('tpl.mainSub', { order: main.groups.map((g) => g.label).join(' → ') })}</p>
      <div className="tpl-columns">
        {main.groups.map((g) => (
          <section key={g.id}>
            <div className="group-head">
              <button className="group-toggle" aria-expanded={!collapsed.includes(g.id)} onClick={() => toggleGroup(g.id)}>
                <ChevronIcon width={16} height={16} className={'chev' + (collapsed.includes(g.id) ? '' : ' is-open')} />
                <h2>{g.label}</h2><span className="muted small">{groupSub(g.id)}</span>
              </button>
              <button className="icon-btn icon-sm" aria-label={t('tpl.renameGroup')} title={t('tpl.renameGroup')} onClick={() => rename(g)}><PencilIcon width={14} height={14} /></button>
            </div>
            {collapsed.includes(g.id) ? (
              <div className="tpl-chips">
                {main.templates.filter((x) => x.group === g.id).map((x) => <button key={x.id} className="btn btn-ghost btn-sm" onClick={() => start(x)}>{t('tpl.start')} {x.variant}</button>)}
              </div>
            ) : (
            <div className="tpl-grid">
              {main.templates.filter((x) => x.group === g.id).map((x) => (
                <TemplateCard key={x.id} tpl={x} onStart={start} onEdit={(tpl) => openEditor(tpl, true)} onDuplicate={duplicate} onDelete={() => removeMain(x)} />
              ))}
              <button className="add-variant" onClick={() => addVariant(g)} aria-label={t('tpl.addVariant')}><PlusIcon width={16} height={16} /><span>{t('tpl.addVariant')}</span></button>
            </div>
            )}
          </section>
        ))}
      </div>
      <div className="editor-anchor-main" />
      {editor(true)}

      <section>
        <h2 className="tpl-section">{t('tpl.mine')}</h2>
        <p className="muted small tpl-explain">{t('tpl.mineSub')}</p>
        <div className="tpl-grid tpl-mine">
          {mine.map((x) => <TemplateCard key={x.id} tpl={x} onStart={start} onEdit={(tpl) => openEditor(tpl, false)} onDelete={deleteTemplate} />)}
        </div>
        <div className="editor-anchor" />
        {editor(false) || (
          <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={() => openEditor({ id: uid(), name: '', color: '', group: '', variant: '', exercises: [] }, false)}>
            <PlusIcon width={16} height={16} /> {t('tpl.new')}
          </button>
        )}
      </section>
    </div>
  );
}
