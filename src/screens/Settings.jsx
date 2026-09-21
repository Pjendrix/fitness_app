import { useStore } from '../lib/store.jsx';
import ViewToggle from '../components/ViewToggle.jsx';
import { download } from '../lib/csv.js';
import { t, useLang } from '../lib/i18n.js';

export default function Settings({ go }) {
  const { user, mode, workouts, prs, templates, library, resetLibrary, signOut, notify } = useStore();
  const { lang, setLang } = useLang();

  const exportData = () => {
    download('forge-export.json', JSON.stringify({ exportedAt: new Date().toISOString(), workouts, prs, templates: templates.filter((x) => !x.builtin), library }, null, 2), 'application/json');
    notify(t('set.exported'));
  };
  const reset = () => {
    if (!window.confirm(t('set.confirmReset'))) return;
    resetLibrary();
    notify(t('set.resetDone'));
  };

  return (
    <div className="screen">
      <header className="screen-head"><h1>{t('set.title')}</h1></header>

      <section className="card profile">
        {user.photo ? <img src={user.photo} alt="" referrerPolicy="no-referrer" className="avatar" /> : <div className="avatar avatar-fallback">{(user.name || '?')[0]}</div>}
        <div>
          <div>{user.name || t('set.user')}</div>
          <div className="muted small">{user.email}</div>
        </div>
      </section>

      <section className="card list">
        <div className="row"><span>{t('set.lang')}</span>
          <div className="seg seg-sm seg-inline" role="tablist">
            {[['en', 'English'], ['cs', 'Čeština']].map(([id, l]) => <button key={id} role="tab" aria-selected={lang === id} className={lang === id ? 'is-on' : ''} onClick={() => setLang(id)}>{l}</button>)}
          </div>
        </div>
        <div className="row"><span>{t('set.view')}</span><ViewToggle full /></div>
        <div className="row"><span>{t('set.storage')}</span><span className="muted">{mode === 'firebase' ? t('set.cloud') : t('set.local')}</span></div>
        <div className="row"><span>{t('set.units')}</span><span className="muted">kg</span></div>
        <div className="row"><span>{t('set.done')}</span><span className="muted">{workouts.length}</span></div>
      </section>

      <section className="card list">
        <div className="row"><span>{t('set.library')}</span><span className="muted">{t('ex.count', { n: library.length })}</span></div>
        <div className="row row-btns">
          <button className="btn btn-ghost btn-sm" onClick={() => go('exercises')}>{t('set.openLibrary')}</button>
          <button className="btn btn-ghost btn-sm" onClick={reset}>{t('set.reset')}</button>
        </div>
      </section>

      <button className="btn btn-ghost btn-block" onClick={exportData}>{t('set.export')}</button>
      <button className="btn btn-danger btn-block" onClick={signOut}>{t('set.logout')}</button>
    </div>
  );
}
