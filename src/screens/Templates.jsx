import { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { GROUP_ORDER, GROUPS } from '../data/defaultTemplates.js';
import { planLabel, uid } from '../lib/util.js';
import { ChevronIcon, PlusIcon, TrashIcon } from '../components/Icons.jsx';

// "Bench Press – 4× 6-8" → {name, sets, reps}
const parseLine = (line) => {
  const m = line.match(/^(.*?)\s*[–—-]\s*(\d+)\s*[×x]\s*(.*)$/i);
  if (m) return { name: m[1].trim(), sets: Math.min(20, +m[2]), reps: m[3].trim(), note: '' };
  return { name: line.trim(), sets: 3, reps: '', note: '' };
};

function TemplateCard({ tpl, onStart, onDelete }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={'glass tpl' + (tpl.variant === 'Hardcore' ? ' is-hard' : '')}>
      <button className="tpl-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <div>
          <h3>{tpl.variant || tpl.name}</h3>
          <p className="muted small">{tpl.exercises.length} cvičení</p>
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
        {onDelete && <button className="btn btn-danger-ghost btn-sm" onClick={() => window.confirm('Smazat šablonu?') && onDelete(tpl.id)}><TrashIcon width={16} height={16} /></button>}
      </div>
    </div>
  );
}

export default function Templates({ go }) {
  const { templates, active, startWorkout, saveTemplate, deleteTemplate, notify } = useStore();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [lines, setLines] = useState('');

  const start = (tpl) => {
    if (active && !window.confirm('Rozdělaný trénink bude nahrazen. Pokračovat?')) return;
    startWorkout(tpl);
    go('workout');
  };

  const save = () => {
    const exercises = lines.split('\n').map((l) => l.trim()).filter(Boolean).map(parseLine);
    if (!name.trim() || !exercises.length) return notify('Zadej název a aspoň jedno cvičení');
    saveTemplate({ id: uid(), name: name.trim(), group: '', variant: '', exercises });
    setName(''); setLines(''); setCreating(false);
  };

  const mine = templates.filter((t) => !t.builtin);

  return (
    <div className="screen">
      <header className="screen-head"><h1>Šablony</h1></header>

      {GROUP_ORDER.map((g) => (
        <section key={g}>
          <div className="group-head"><h2>{GROUPS[g].label}</h2><span className="muted small">{GROUPS[g].sub}</span></div>
          <div className="tpl-grid">
            {templates.filter((t) => t.builtin && t.group === g).map((t) => <TemplateCard key={t.id} tpl={t} onStart={start} />)}
          </div>
        </section>
      ))}

      <section>
        <div className="group-head"><h2>Moje šablony</h2></div>
        {mine.map((t) => <TemplateCard key={t.id} tpl={t} onStart={start} onDelete={deleteTemplate} />)}
        {creating ? (
          <div className="glass form">
            <input placeholder="Název šablony" value={name} onChange={(e) => setName(e.target.value)} />
            <textarea rows={6} placeholder={'Jedno cvičení na řádek, např.\nBench Press – 4× 6-8\nDips – 3× max'} value={lines} onChange={(e) => setLines(e.target.value)} />
            <div className="row-actions">
              <button className="btn btn-primary btn-sm" onClick={save}>Uložit šablonu</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setCreating(false)}>Zrušit</button>
            </div>
          </div>
        ) : (
          <button className="btn btn-ghost btn-block" onClick={() => setCreating(true)}><PlusIcon width={16} height={16} /> Nová šablona</button>
        )}
      </section>
    </div>
  );
}
