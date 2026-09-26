import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { colorHex } from '../data/defaultTemplates.js';
import { fmtDate, fmtDuration, fmtNum, fmtSet, workoutVolume } from '../lib/util.js';
import { locale, t } from '../lib/i18n.js';
import { ArrowIcon, ChevronIcon, RepeatIcon, SearchIcon, TrashIcon, TrophyIcon } from '../components/Icons.jsx';
import ExerciseSheet from '../components/ExerciseSheet.jsx';
import { recordText } from '../components/WorkoutSummary.jsx';
import { norm } from '../components/ExercisePicker.jsx';
import { useDialog } from '../components/Dialog.jsx';
import WorkoutEditor from '../components/WorkoutEditor.jsx';
import { previousSame } from '../lib/metrics.js';
import { metricsOf, recordsOf } from '../lib/derived.js';

const dayKey = (ms) => new Date(ms).toDateString();
const monday = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };

// Srovnání s minulým stejným tréninkem
function Compare({ cur, prev, prevDate }) {
  const [more, setMore] = useState(false);
  const pct = (a, b) => (a != null && b ? Math.round((a / b - 1) * 100) : null);
  const all = [
    { l: t('wl.m.volume'), v: `${fmtNum(Math.round(cur.volume))} kg`, d: pct(cur.volume, prev.volume), u: ' %' },
    { l: t('wl.m.sets'), v: fmtNum(cur.sets), d: cur.sets - prev.sets, u: '' },
    { l: t('wl.m.density'), v: cur.density != null ? `${Math.round(cur.density)} kg/min` : '–', d: pct(cur.density, prev.density), u: ' %' },
    { l: t('wl.m.intensity'), v: cur.intensity != null ? `${Math.round(cur.intensity)} %` : '–', d: cur.intensity != null && prev.intensity != null ? Math.round(cur.intensity - prev.intensity) : null, u: ` ${t('wl.pts')}` },
    { l: t('wl.m.minutes'), v: `${Math.round(cur.minutes)} min`, d: Math.round(cur.minutes - prev.minutes), u: ' min', neutral: true },
  ];
  // Základ: objem, série, délka. Hustota a intenzita až po rozbalení, s vysvětlením.
  const rows = more ? all : all.filter((r) => r.l !== t('wl.m.density') && r.l !== t('wl.m.intensity'));
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
      <button className="link cmp-more" onClick={() => setMore(!more)}>{more ? t('cmp.less') : t('cmp.more')}</button>
      {more && <p className="muted small">{t('cmp.explain')}</p>}
    </div>
  );
}

function WorkoutCard({ w, color, open, onToggle, onDelete, onEdit, metrics, all, records, onExercise, onRepeat }) {
  const prev = open ? previousSame(w, all) : null;
  const dialog = useDialog();
  const sets = w.exercises.reduce((n, e) => n + e.sets.length, 0);
  return (
    <section className="card hist tinted" style={color ? { '--tint': color } : undefined}>
      <button className="hist-head" onClick={onToggle} aria-expanded={open}>
        <div>
          <h2>{w.name}{records?.length ? <span className="pb-badge"><TrophyIcon width={12} height={12} /> {t('hist.pbBadge', { n: records.length })}</span> : null}</h2>
          <p className="muted small">{fmtDate(w.startedAt)} · {fmtDuration(w.finishedAt - w.startedAt)} · {t('count.sets', { n: sets })} · {fmtNum(Math.round(workoutVolume(w)))} kg</p>
        </div>
        <ChevronIcon className={'chev' + (open ? ' is-open' : '')} />
      </button>
      {open && (
        <div className="hist-body">
          {w.exercises.map((e) => (
            <div key={e.key} className="hist-ex">
              <button className="ex-name" onClick={() => onExercise(e.key)}>{e.name}</button>
              {records?.some((r) => r.key === e.key) && <span className="pb">{recordText(records.find((r) => r.key === e.key))}</span>}
              {(e.rpe || e.note) && <div className="muted small">{[e.rpe && `RPE ${e.rpe}`, e.note].filter(Boolean).join(' · ')}</div>}
              <div className="mono muted small sets-line">{e.sets.map((s) => fmtSet(s.weight, s.reps, s.time)).join('  ·  ')}</div>
            </div>
          ))}
          {prev && metrics.get(w.id) && metrics.get(prev.id) && <Compare cur={metrics.get(w.id)} prev={metrics.get(prev.id)} prevDate={fmtDate(prev.startedAt)} />}
          <div className="row-actions">
          <button className="btn btn-primary btn-sm" onClick={() => onRepeat(w)}><RepeatIcon width={16} height={16} /> {t('hist.repeat')}</button>
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
  // Legenda: tréninky v zobrazeném měsíci podle barvy šablony
  const legend = (() => {
    const m = new Map();
    for (const d of cells) if (d) for (const w of byDay[dayKey(d)] || []) if (!m.has(w.name)) m.set(w.name, { name: w.name, color: colorOf(w) });
    return [...m.values()];
  })();
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
      {legend.length > 0 && (
        <div className="cal-legend">
          {legend.map((l) => <span key={l.name}><i style={{ background: l.color || 'var(--ink)' }} />{l.name}</span>)}
        </div>
      )}
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

const WEEKS_PAGE = 8;

export default function History({ go }) {
  const { workouts, templates, deleteWorkout, loading, startWorkout, live } = useStore();
  const dialog = useDialog();
  const [q, setQ] = useState('');
  const [exKeyOpen, setExKeyOpen] = useState(null);
  const records = recordsOf(workouts);
  // H4: zopakovat – podle šablony, když ještě existuje, jinak podle odcvičených cviků
  const repeat = async (w) => {
    if (live && !(await dialog.confirm(t('wo.replace'), { danger: true, ok: t('tpl.start') }))) return;
    const tpl = templates.find((x) => x.id === w.templateId);
    startWorkout(tpl || {
      id: '', name: w.name, group: w.group, variant: w.variant,
      exercises: w.exercises.map((e) => ({ name: e.name, type: e.type, sets: e.sets.length, reps: e.type === 'time' ? '' : String(e.sets[0]?.reps || ''), ss: e.ss || '' })),
    });
    go('workout');
  };
  const [open, setOpen] = useState(null);
  const [editing, setEditing] = useState(null);
  const [view, setView] = useState('list');
  const [filter, setFilter] = useState('all');
  const [day, setDay] = useState(dayKey(Date.now()));

  const metrics = metricsOf(workouts);
  const colorById = useMemo(() => new Map(templates.map((x) => [x.id, colorHex(x.color)])), [templates]);
  const colorOf = (w) => colorById.get(w.templateId);
  // Filter options = workout names that exist in history (template renames keep their own entry)
  const options = useMemo(() => [...new Set(workouts.map((w) => w.name))].sort(), [workouts]);
  const query = norm(q.trim());
  const filtered = useMemo(() => workouts.filter((w) => (filter === 'all' || w.name === filter) && (!query || w.exercises.some((e) => norm(e.name).includes(query)))), [workouts, filter, query]);
  const shown = useMemo(() => (view === 'calendar' ? filtered.filter((w) => dayKey(w.startedAt) === day) : filtered), [filtered, view, day]);
  // D2: vykreslit jen posledních N týdnů; další na tlačítko (1000 karet najednou telefon zpomalí)
  const [weeks, setWeeks] = useState(WEEKS_PAGE);
  useEffect(() => { setWeeks(WEEKS_PAGE); }, [filter, query, view]);
  // H1: seskupení po týdnech (v kalendáři jedna skupina)
  const groups = useMemo(() => {
    if (view === 'calendar') return [{ key: 'day', list: shown, vol: 0, label: '' }];
    const out = [];
    const cur = monday(Date.now());
    for (const w of shown) {
      const m = monday(w.startedAt);
      let g = out[out.length - 1];
      if (!g || g.key !== m) {
        const weeks = Math.round((cur - m) / (7 * 864e5));
        const label = weeks === 0 ? t('hist.thisWeek') : weeks === 1 ? t('hist.lastWeek') : t('hist.weekOf', { d: new Date(m).toLocaleDateString(locale(), { day: 'numeric', month: 'short' }) });
        g = { key: m, list: [], vol: 0, label };
        out.push(g);
      }
      g.list.push(w);
      g.vol += workoutVolume(w);
    }
    return out;
  }, [shown, view]);
  const visible = view === 'calendar' ? groups : groups.slice(0, weeks);
  const hidden = groups.slice(visible.length).reduce((n, g) => n + g.list.length, 0);

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
          <label className="hist-search"><SearchIcon width={16} height={16} /><input className="input input-sm" type="search" maxLength={60} placeholder={t('hist.searchEx')} aria-label={t('hist.searchEx')} value={q} onChange={(e) => setQ(e.target.value)} /></label>
        </div>
      )}

      {view === 'calendar' && <Calendar workouts={filtered} colorOf={colorOf} selected={day} onSelect={setDay} />}

      {!workouts.length && <p className="empty">{loading ? t('hist.loading') : t('hist.empty')}</p>}
      {workouts.length > 0 && !shown.length && <p className="empty">{view === 'calendar' ? t('hist.dayEmpty') : t('hist.noMatch')}</p>}
      {visible.map((g) => (
        <section key={g.key} className="hist-week">
          {view === 'list' && (
            <div className="hist-week-head">
              <h3 className="label">{g.label}</h3>
              <span className="label">{t('hist.weekSum', { n: g.list.length, v: fmtNum(Math.round(g.vol / 100) / 10) })}</span>
            </div>
          )}
          {g.list.map((w) => (
            <WorkoutCard key={w.id} w={w} color={colorOf(w)} open={open === w.id || (view === 'calendar' && shown.length === 1)} onToggle={() => setOpen(open === w.id ? null : w.id)} onDelete={deleteWorkout} onEdit={setEditing} metrics={metrics} all={workouts}
              records={records.get(w.id)} onExercise={setExKeyOpen} onRepeat={repeat} />
          ))}
        </section>
      ))}
      {hidden > 0 && (
        <button className="btn btn-ghost btn-block" onClick={() => setWeeks((n) => n + WEEKS_PAGE)}>{t('hist.more', { n: hidden })}</button>
      )}
            {exKeyOpen && <ExerciseSheet exKey={exKeyOpen} onClose={() => setExKeyOpen(null)} />}
      {editing && <WorkoutEditor key={editing.id} workout={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
