import { useState } from 'react';
import Sheet from './Sheet.jsx';
import NumField, { oneStep, weightStep } from './NumField.jsx';
import ExercisePicker from './ExercisePicker.jsx';
import { useStore } from '../lib/store.jsx';
import { useDialog } from './Dialog.jsx';
import { DECIMAL_INPUT, exKey, INT_INPUT, num, uid } from '../lib/util.js';
import { t } from '../lib/i18n.js';
import { PlusIcon, TrashIcon, XIcon } from './Icons.jsx';

// <input type="datetime-local"> pracuje v místním čase bez zóny
const toLocalInput = (ms) => { const d = new Date(ms); return new Date(ms - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
const fromLocalInput = (s) => new Date(s).getTime();
const toDraft = (w) => ({
  name: w.name,
  start: toLocalInput(w.startedAt),
  minutes: String(Math.max(1, Math.round((w.finishedAt - w.startedAt) / 60000))),
  exercises: w.exercises.map((e) => ({
    id: uid(), key: e.key, name: e.name, type: e.type,
    sets: e.sets.map((s) => ({ id: uid(), weight: s.weight ? String(s.weight) : '', reps: s.reps ? String(s.reps) : '', time: s.time ? String(s.time) : '' })),
  })),
});

// Úprava odcvičeného tréninku: název, začátek, délka, cviky a série.
export default function WorkoutEditor({ workout, onClose }) {
  const { updateWorkout, typeOf, notify } = useStore();
  const dialog = useDialog();
  const [d, setD] = useState(() => toDraft(workout));
  const [picking, setPicking] = useState(false);
  const dirty = JSON.stringify(d) !== JSON.stringify(toDraft(workout)) ? true : false;

  const setEx = (exId, fn) => setD((x) => ({ ...x, exercises: x.exercises.map((e) => (e.id === exId ? fn(e) : e)) }));
  const setSet = (exId, setId, patch) => setEx(exId, (e) => ({ ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }));
  const addSet = (exId) => setEx(exId, (e) => { const p = e.sets[e.sets.length - 1] || {}; return { ...e, sets: [...e.sets, { id: uid(), weight: p.weight || '', reps: p.reps || '', time: p.time || '' }] }; });
  const removeSet = (exId, setId) => setEx(exId, (e) => ({ ...e, sets: e.sets.filter((s) => s.id !== setId) }));
  const removeEx = (exId) => setD((x) => ({ ...x, exercises: x.exercises.filter((e) => e.id !== exId) }));
  const addEx = (ex) => {
    const type = ex.type || typeOf(ex.name);
    setD((x) => ({ ...x, exercises: [...x.exercises, { id: uid(), key: exKey(ex.name), name: ex.name, type: type === 'time' ? 'time' : undefined, sets: [{ id: uid(), weight: '', reps: '', time: '' }] }] }));
    setPicking(false);
  };

  const startMs = fromLocalInput(d.start);
  const minutes = Math.round(num(d.minutes));
  const hasSet = d.exercises.some((e) => e.sets.some((s) => (e.type === 'time' ? num(s.time) > 0 : num(s.reps) > 0)));
  const future = Number.isFinite(startMs) && startMs > Date.now();
  const valid = d.name.trim() && Number.isFinite(startMs) && !future && minutes >= 1 && minutes <= 600 && hasSet;

  const save = () => {
    if (!valid) return;
    const ok = updateWorkout({ id: workout.id, name: d.name, startedAt: startMs, finishedAt: startMs + minutes * 60000, exercises: d.exercises });
    if (ok) { notify(t('edit.saved')); onClose(); } else notify(t('edit.needSet'));
  };
  const close = async () => {
    if (!dirty || (await dialog.confirm(t('edit.discard'), { danger: true, ok: t('edit.discardOk') }))) onClose();
  };

  return (
    <Sheet label={t('edit.title')} onClose={close} className="edit-sheet">
      <div className="sheet-head">
        <h2>{t('edit.title')}</h2>
        <button className="btn btn-ghost btn-sm" onClick={close}>{t('dlg.cancel')}</button>
      </div>
      <div className="edit-body">
        <label className="mini"><span className="label">{t('edit.name')}</span>
          <input className="input" maxLength={80} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
        </label>
        <div className="edit-when">
          <label className="mini"><span className="label">{t('edit.start')}</span>
            <input className="input" type="datetime-local" max={toLocalInput(Date.now())} value={d.start} onChange={(e) => setD({ ...d, start: e.target.value })} />
          </label>
          <label className="mini"><span className="label">{t('edit.duration')}</span>
            <input className="input" inputMode="numeric" maxLength={3} value={d.minutes} onChange={(e) => /^\d{0,3}$/.test(e.target.value) && setD({ ...d, minutes: e.target.value })} />
          </label>
        </div>
        {future && <p className="login-error">{t('edit.future')}</p>}

        {d.exercises.map((e) => {
          const timed = e.type === 'time';
          return (
            <section key={e.id} className="edit-ex-card">
              <div className="row-between"><h3>{e.name}</h3>
                <button className="icon-btn danger" aria-label={t('wo.removeEx')} onClick={() => removeEx(e.id)}><TrashIcon width={17} height={17} /></button>
              </div>
              <div className="edit-set edit-set-head label" aria-hidden="true"><span>#</span><span>{timed ? t('wo.col.min') : t('wo.col.reps')}</span><span>{t('wo.col.kg')}</span><span /></div>
              {e.sets.map((s, i) => (
                <div key={s.id} className="edit-set">
                  <span className="set-n">{i + 1}</span>
                  {timed
                    ? <NumField label={t('wo.time', { n: i + 1 })} placeholder="0" mode="decimal" pattern={DECIMAL_INPUT} value={s.time} step={oneStep} onChange={(v) => setSet(e.id, s.id, { time: v })} />
                    : <NumField label={t('wo.reps', { n: i + 1 })} placeholder="0" mode="numeric" pattern={INT_INPUT} value={s.reps} step={oneStep} onChange={(v) => setSet(e.id, s.id, { reps: v })} />}
                  <NumField label={t('wo.weight', { n: i + 1 })} placeholder="BW" mode="decimal" pattern={DECIMAL_INPUT} value={s.weight} step={weightStep} onChange={(v) => setSet(e.id, s.id, { weight: v })} />
                  <button className="icon-btn" aria-label={t('wo.delSet', { n: i + 1 })} onClick={() => removeSet(e.id, s.id)}><XIcon width={16} height={16} /></button>
                </div>
              ))}
              <button className="btn btn-ghost btn-sm edit-add-set" onClick={() => addSet(e.id)}><PlusIcon width={16} height={16} /> {t('wo.addSet')}</button>
            </section>
          );
        })}
        <button className="btn btn-ghost btn-block" onClick={() => setPicking(true)}><PlusIcon width={16} height={16} /> {t('wo.addEx')}</button>
      </div>
      <div className="edit-foot">
        {!hasSet && <p className="muted small">{t('edit.needSet')}</p>}
        <button className="btn btn-primary btn-block" disabled={!valid} onClick={save}>{t('edit.save')}</button>
      </div>
      {picking && <ExercisePicker exclude={d.exercises.map((e) => e.key)} onClose={() => setPicking(false)} onPick={addEx} />}
    </Sheet>
  );
}
