import { useMemo, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { colorHex } from '../data/defaultTemplates.js';
import { fmtDate, fmtDuration, fmtNum, fmtSet, workoutVolume } from '../lib/util.js';
import { locale, t } from '../lib/i18n.js';
import { ArrowIcon, ChevronIcon, TrashIcon } from '../components/Icons.jsx';
import { useDialog } from '../components/Dialog.jsx';
import WorkoutEditor from '../components/WorkoutEditor.jsx';
import { computeMetrics, previousSame } from '../lib/metrics.js';

const dayKey = (ms) => new Date(ms).toDateString();

// Srovnání s minulým stejným tréninkem
function Compare({ cur, prev, prevDate }) {
  const pct = (a, b) => (a != null && b ? Math.round((a / b - 1) * 100) : null);
  const rows = [
    { l: t('wl.m.volume'), v: `${fmtNum(Math.round(cur.volume))} kg`, d: pct(cur.volume, prev.volume), u: ' %' },
    { l: t('wl.m.sets'), v: fmtNum(cur.sets), d: cur.sets - prev.sets, u: '' },
    { l: t('wl.m.density'), v: cur.density != null ? `${Math.round(cur.density)} kg/min` : '–', d: pct(cur.density, prev.density), u: ' %' },
    { l: t('wl.m.intensity'), v: cur.intensity != null ? `${Math.round(cur.intensity)} %` : '–', d: cur.intensity != null && prev.intensity != null ? Math.round(cur.intensity - prev.intensity) : null, u: ` ${t('wl.pts')}` },
    { l: t('wl.m.minutes'), v: `${Math.round(cur.minutes)} min`, d: Math.round(cur.minutes - prev.minutes), u: ' min', neutral: true },
  ];
  return (
    <div className="hist-compare">
      <div className="muted small">{t('wl.vsPrev', { name: prev.name, d: prevDate })}</div>
      {rows.map((r) => (
        <div key={r.l} className="hist-cmp-row">
          <span>{r.l}</span>
          <span className="mono">{r.v}{' '}
            {r.d != null && <span className={r.d === 0 || r.neutral ? 'muted' : r.d > 0 ? 'wl-up' : 'wl-down'}>{r.d > 0 ? '+' : r.d < 0 ? '−' : '±'}{Math.abs(r.d)}{r.u}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

function WorkoutCard({ w, color, open, onToggle, onDelete, onEdit, metrics, all }) {
  const prev = open ? previousSame(w, all) : null;
  const dialog = useDialog();
  const sets = w.exercises.reduce((n, e) => n + e.sets.length, 0);
  return (
    <section className="card hist tinted" style={color ? { '--tint': color } : undefined}>
      <button className="hist-head" onClick={onToggle} aria-expanded={open}>
        <div>
          <h2>{w.name}</h2>
          <p className="muted small">{fmtDate(w.startedAt)} · {fmtDuration(w.finishedAt - w.startedAt)} · {t('count.sets', { n: sets })} · {fmtNum(Math.round(workoutVolume(w)))} kg</p>
        </div>
        <ChevronIcon className={'chev' + (open ? ' is-open' : '')} />
      </button>
      {open && (
        <div className="hist-body">
          {w.exercises.map((e) => (
            <div key={e.key} className="hist-ex">
              <div>{e.name}</div>
              <div className="mono muted small sets-line">{e.sets.map((s) => fmtSet(s.weight, s.reps, s.time)).join('  ·  ')}</div>
            </div>
          ))}
          {prev && metrics.get(w.id) && metrics.get(prev.id) && <Compare cur={metrics.get(w.id)} prev={metrics.get(prev.id)} prevDate={fmtDate(prev.startedAt)} />}
          <div className="row-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(w)}>{t('hist.edit')}</button>
          <button className="btn btn-danger btn-sm" onClick={async () => (await dialog.confirm(t('hist.confirmDelete'), { danger: true, ok: t('hist.delete') })) && onDelete(w.id)}>
            <TrashIcon width={16} height={16} /> {t('hist.delete')}
          </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Calendar({ workouts, colorOf, selected, onSelect }) {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const byDay = useMemo(() => {
    const m = {};
    for (const w of workouts) (m[dayKey(w.startedAt)] ||= []).push(w);
    return m;
  }, [workouts]);

  const lead = (month.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  const today = dayKey(Date.now());
  const monthCount = cells.filter(Boolean).reduce((n, d) => n + (byDay[dayKey(d)]?.length || 0), 0);
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale(), { weekday: 'narrow' }));
  const shift = (n) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));

  return (
    <div className="card cal">
      <div className="cal-head">
        <button className="icon-btn" aria-label={t('hist.prev')} onClick={() => shift(-1)}><ArrowIcon width={18} height={18} /></button>
        <div className="cal-title">
          <h2>{month.toLocaleDateString(locale(), { month: 'long', year: 'numeric' })}</h2>
          <span className="label">{t('hist.month', { n: monthCount })}</span>
        </div>
        <button className="icon-btn" aria-label={t('hist.next')} onClick={() => shift(1)}><ArrowIcon width={18} height={18} style={{ transform: 'rotate(180deg)' }} /></button>
      </div>
      <div className="cal-grid">
        {weekdays.map((d, i) => <span key={'w' + i} className="label cal-wd">{d}</span>)}
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const k = dayKey(d);
          const ws = byDay[k] || [];
          return (
            <button key={i} className={'cal-day' + (ws.length ? ' has' : '') + (k === today ? ' is-today' : '') + (selected === k ? ' is-sel' : '')} onClick={() => onSelect(k)}>
              <span>{d.getDate()}</span>
              <span className="cal-dots">{ws.slice(0, 3).map((w) => <i key={w.id} style={{ background: colorOf(w) || 'var(--ink)' }} />)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function History({ go }) {
  const { workouts, templates, deleteWorkout, loading } = useStore();
  const [open, setOpen] = useState(null);
  const [editing, setEditing] = useState(null);
  const [view, setView] = useState('list');
  const [filter, setFilter] = useState('all');
  const [day, setDay] = useState(dayKey(Date.now()));

  const metrics = useMemo(() => computeMetrics(workouts), [workouts]);
  const colorById = useMemo(() => new Map(templates.map((x) => [x.id, colorHex(x.color)])), [templates]);
  const colorOf = (w) => colorById.get(w.templateId);
  // Filter options = workout names that exist in history (template renames keep their own entry)
  const options = useMemo(() => [...new Set(workouts.map((w) => w.name))].sort(), [workouts]);
  const filtered = filter === 'all' ? workouts : workouts.filter((w) => w.name === filter);
  const shown = view === 'calendar' ? filtered.filter((w) => dayKey(w.startedAt) === day) : filtered;

  return (
    <div className="screen">
      <header className="screen-head row-between"><h1>{t('hist.title')}</h1><button className="btn btn-ghost btn-sm" onClick={() => go('stats')}>{t('hist.analytics')}</button></header>

      {workouts.length > 0 && (
        <div className="hist-tools">
          <div className="seg seg-sm seg-inline" role="tablist">
            {['list', 'calendar'].map((v) => <button key={v} role="tab" aria-selected={view === v} className={view === v ? 'is-on' : ''} onClick={() => setView(v)}>{t('hist.' + v)}</button>)}
          </div>
          <select className="input input-sm" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label={t('hist.allTemplates')}>
            <option value="all">{t('hist.allTemplates')}</option>
            {options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      )}

      {view === 'calendar' && <Calendar workouts={filtered} colorOf={colorOf} selected={day} onSelect={setDay} />}

      {!workouts.length && <p className="empty">{loading ? t('hist.loading') : t('hist.empty')}</p>}
      {workouts.length > 0 && !shown.length && <p className="empty">{view === 'calendar' ? t('hist.dayEmpty') : t('hist.noMatch')}</p>}
      {shown.map((w) => (
        <WorkoutCard key={w.id} w={w} color={colorOf(w)} open={open === w.id || (view === 'calendar' && shown.length === 1)} onToggle={() => setOpen(open === w.id ? null : w.id)} onDelete={deleteWorkout} onEdit={setEditing} metrics={metrics} all={workouts} />
      ))}
      {editing && <WorkoutEditor key={editing.id} workout={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
