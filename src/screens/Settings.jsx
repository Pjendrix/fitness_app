import { useStore } from '../lib/store.jsx';

export default function Settings() {
  const { user, mode, workouts, prs, templates, signOut, notify } = useStore();

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), workouts, prs, templates: templates.filter((t) => !t.builtin) }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'forge-export.json';
    a.click();
    URL.revokeObjectURL(a.href);
    notify('Export stažen');
  };

  return (
    <div className="screen">
      <header className="screen-head"><h1>Nastavení</h1></header>

      <section className="card profile">
        {user.photo ? <img src={user.photo} alt="" referrerPolicy="no-referrer" className="avatar" /> : <div className="avatar avatar-fallback">{(user.name || '?')[0]}</div>}
        <div>
          <div>{user.name || 'Uživatel'}</div>
          <div className="muted small">{user.email}</div>
        </div>
      </section>

      <section className="card list">
        <div className="row"><span>Úložiště</span><span className="muted">{mode === 'firebase' ? 'Cloud Firestore' : 'Lokální (demo)'}</span></div>
        <div className="row"><span>Jednotky</span><span className="muted">kg</span></div>
        <div className="row"><span>Odcvičených tréninků</span><span className="muted">{workouts.length}</span></div>
      </section>

      <button className="btn btn-ghost btn-block" onClick={exportData}>Exportovat data (JSON)</button>
      <button className="btn btn-danger-ghost btn-block" onClick={signOut}>Odhlásit se</button>
    </div>
  );
}
