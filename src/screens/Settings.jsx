import { useStore } from '../lib/store.jsx';
import ViewToggle from '../components/ViewToggle.jsx';
import { download } from '../lib/csv.js';
import { PROFILES } from '../data/defaultTemplates.js';
import { t, useLang } from '../lib/i18n.js';
import { useDialog } from '../components/Dialog.jsx';
import { useTheme } from '../lib/theme.js';
import { getRestDefault, REST_OPTIONS, setRestDefault } from '../lib/rest.js';
import { useState } from 'react';

export default function Settings({ go }) {
  const { user, mode, workouts, prs, templates, library, resetLibrary, signOut, notify, profile, setProfile, resetMain, resetDemo } = useStore();
  const demo = mode === 'demo';
  const pName = (p) => (demo ? t(p.id === 'krystof' ? 'prof.demoA' : 'prof.demoB') : p.name);
  const { lang, setLang } = useLang();
  const { theme, setTheme } = useTheme();
  const dialog = useDialog();
  const [restSec, setRestSec] = useState(getRestDefault);

  const exportData = () => {
    download('forge-export.json', JSON.stringify({ exportedAt: new Date().toISOString(), workouts, prs, templates: templates.filter((x) => !x.builtin), library }, null, 2), 'application/json');
    notify(t('set.exported'));
  };
  const reset = async () => {
    if (!(await dialog.confirm(t('set.confirmReset'), { danger: true, ok: t('set.reset') }))) return;
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
          <div className="muted small">{demo ? t('demo.local') : user.email}</div>
        </div>
      </section>

      <section className="card list">
        <div className="row"><span>{t('prof.title')}</span>
          <div className="seg seg-sm seg-inline" role="radiogroup">
            {Object.values(PROFILES).map((p) => <button key={p.id} role="radio" aria-checked={profile === p.id} className={profile === p.id ? 'is-on' : ''} onClick={() => { setProfile(p.id); notify(t('prof.saved', { name: pName(p) })); }}>{pName(p)}</button>)}
          </div>
        </div>
        <div className="row"><span>{t('set.lang')}</span>
          <div className="seg seg-sm seg-inline" role="radiogroup">
            {[['en', 'English'], ['cs', 'Čeština']].map(([id, l]) => <button key={id} role="radio" aria-checked={lang === id} className={lang === id ? 'is-on' : ''} onClick={() => setLang(id)}>{l}</button>)}
          </div>
        </div>
        <div className="row"><span>{t('set.theme')}</span>
          <div className="seg seg-sm seg-inline" role="radiogroup" aria-label={t('set.theme')}>
            {['light', 'dark', 'auto'].map((id) => <button key={id} role="radio" aria-checked={theme === id} className={theme === id ? 'is-on' : ''} onClick={() => setTheme(id)}>{t('theme.' + id)}</button>)}
          </div>
        </div>
        <div className="row"><span>{t('set.rest')}</span>
          <div className="seg seg-sm seg-inline" role="radiogroup" aria-label={t('set.rest')}>
            {REST_OPTIONS.map((s) => <button key={s} role="radio" aria-checked={restSec === s} className={restSec === s ? 'is-on' : ''} onClick={() => { setRestDefault(s); setRestSec(s); }}>{s ? (s % 60 ? `${s}s` : `${s / 60}m`) : t('rest.off')}</button>)}
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
          <button className="btn btn-ghost btn-sm" onClick={async () => { if (await dialog.confirm(t('set.confirmResetTpl'), { danger: true, ok: t('set.resetTpl') })) { resetMain(); notify(t('set.resetTplDone')); } }}>{t('set.resetTpl')}</button>
        </div>
      </section>

      <button className="btn btn-ghost btn-block" onClick={exportData}>{t('set.export')}</button>
      {demo && <button className="btn btn-ghost btn-block" onClick={async () => { if (await dialog.confirm(t('demo.resetConfirm'), { danger: true, ok: t('demo.reset') })) resetDemo(); }}>{t('demo.reset')}</button>}
      <button className="btn btn-danger btn-block" onClick={signOut}>{demo ? t('demo.exit') : t('set.logout')}</button>
    </div>
  );
}
