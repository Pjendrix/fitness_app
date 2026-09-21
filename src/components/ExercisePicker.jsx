import { useMemo, useState } from 'react';
import { CATEGORIES, EXERCISES } from '../data/exercises.js';
import { useStore } from '../lib/store.jsx';
import { exKey } from '../lib/util.js';
import { PlusIcon } from './Icons.jsx';

// Spodní panel: hledání + filtr partie. Umí i vlastní cvičení (uloží se do knihovny uživatele).
export default function ExercisePicker({ onPick, onClose, exclude = [] }) {
  const { customExercises, addCustomExercise, prs } = useStore();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('Vše');
  const [newCat, setNewCat] = useState(CATEGORIES[0]);

  const all = useMemo(() => [...EXERCISES, ...customExercises], [customExercises]);
  const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const list = all.filter((e) => (cat === 'Vše' || e.cat === cat) && norm(e.name).includes(norm(q.trim())));
  const exact = all.some((e) => norm(e.name) === norm(q.trim()));
  const skip = new Set(exclude);

  const createCustom = () => {
    const ex = { name: q.trim(), cat: newCat };
    addCustomExercise(ex);
    onPick(ex);
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="Vybrat cvičení" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h2>Přidat cvičení</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Zavřít</button>
        </div>
        <input className="input" autoFocus placeholder="Hledat cvičení" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="chips">
          {['Vše', ...CATEGORIES].map((c) => (
            <button key={c} className={'chip' + (cat === c ? ' is-on' : '')} onClick={() => setCat(c)}>{c}</button>
          ))}
        </div>
        <div className="sheet-list">
          {list.map((e) => {
            const key = exKey(e.name);
            const pb = prs[key];
            return (
              <button key={e.name} className="pick" disabled={skip.has(key)} onClick={() => onPick(e)}>
                <span>{e.name}</span>
                <span className="label">{skip.has(key) ? 'v tréninku' : pb ? `PB ${pb.weight || 'BW'}×${pb.reps}` : e.cat}</span>
              </button>
            );
          })}
          {!list.length && !q.trim() && <p className="empty">Nic nenalezeno.</p>}
          {q.trim() && !exact && (
            <div className="custom-ex">
              <p>Vytvořit „{q.trim()}“</p>
              <div className="row-actions">
                <select className="input" value={newCat} onChange={(e) => setNewCat(e.target.value)} aria-label="Partie">
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
                <button className="btn btn-primary btn-sm" onClick={createCustom}><PlusIcon width={16} height={16} /> Vytvořit</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
