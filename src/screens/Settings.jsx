import { useStore } from '../lib/store.jsx';
import ViewToggle from '../components/ViewToggle.jsx';
import { download } from '../lib/csv.js';
import { STARTER_IDS } from '../data/defaultTemplates.js';
import AppearanceCard from '../components/AppearanceCard.jsx';
import AccessCard from '../components/AccessCard.jsx';
import { isAdmin } from '../lib/access.js';
import { backend } from '../lib/backend.js';
import { t, useLang } from '../lib/i18n.js';
import { useDialog } from '../components/Dialog.jsx';
import { useTheme } from '../lib/theme.js';
import { getRestDefault, REST_OPTIONS, setRestDefault } from '../lib/rest.js';
import { useRef, useState } from 'react';
import { UploadIcon } from '../components/Icons.jsx';

export default function Settings({ go }) {
  const { user, mode, workouts, prs, templates, library, resetLibrary, signOut, notify, starter, chooseStarter, resetDemo, importData } = useStore();
  const demo = mode === 'demo';
  const { lang, setLang } = useLang();
  const { theme, setTheme } = useTheme();
  const dialog = useDialog();
  const [restSec, setRestSec] = useState(getRestDefault);

  const exportData = () => {
    download('forge-export.json', JSON.stringify({ exportedAt: new Date().toISOString(), workouts, prs, templates: templates.filter((x) => !x.builtin), library }, null, 2), 'application/json');
    notify(t('set.exported'));
  };
  // S3: import zálohy – sloučí se s existujícími daty
  const fileRef = useRef(null);
  const onImport = async (ev) => {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    if (!file) return;
    let json;
    try { json = JSON.parse(await file.text()); } catch { return notify(t('set.importBad')); }
    if (!json || !Array.isArray(json.workouts)) return notify(t('set.importBad'));
    if (!(await dialog.confirm(t('set.importConfirm', { n: json.workouts.length }), { ok: t('set.import') }))) return;
    try {
      const r = await importData(json);
      notify(t('set.importDone', { w: r.workouts, t: r.templates, e: r.exercises }), { duration: 6000 });
    } catch (e) { console.error(e); notify(t('set.importBad')); }
  };
  // Hlavní šablony znovu ze startovního splitu (i jiného než dosud)
  const resetTemplates = async () => {
    const id = await dialog.choose({
      title: t('set.resetTpl'),
      message: t('start.resetMsg'),
      actions: [...STARTER_IDS.map((x) => ({ value: x, label: t('start.' + x) + (x === starter ? ` · ${t('start.current')}` : ''), primary: x === starter })), { value: null, label: t('dlg.cancel') }],
    });
    if (!id) return;
    chooseStarter(id);
    notify(t('set.resetTplDone'));
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
      </section>

      <AppearanceCard />

      {!demo && isAdmin(user.email) && backend.access && <AccessCard />}

      <section className="card list">
        <div className="row"><span>{t('set.library')}</span><span className="muted">{t('ex.count', { n: library.length })}</span></div>
        <div className="row row-btns">
          <button className="btn btn-ghost btn-sm" onClick={() => go('exercises')}>{t('set.openLibrary')}</button>
        </div>
      </section>

      <section className="card list">
        <div className="row"><span>{t('set.backup')}<span className="muted small row-sub">{t('set.backupSub')}</span></span></div>
        <div className="row row-btns">
          <button className="btn btn-ghost btn-sm" onClick={exportData}>{t('set.export')}</button>
          <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}><UploadIcon width={16} height={16} /> {t('set.import')}</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImport} />
        </div>
      </section>

      <section className="card list danger-zone">
        <div className="row"><span className="dz-title">{t('set.danger')}<span className="muted small row-sub">{t('set.dangerSub')}</span></span></div>
        <div className="row row-btns">
          <button className="btn btn-danger btn-sm" onClick={reset}>{t('set.reset')}</button>
          <button className="btn btn-danger btn-sm" onClick={resetTemplates}>{t('set.resetTpl')}</button>
          {demo && <button className="btn btn-danger btn-sm" onClick={async () => { if (await dialog.confirm(t('demo.resetConfirm'), { danger: true, ok: t('demo.reset') })) resetDemo(); }}>{t('demo.reset')}</button>}
        </div>
      </section>

      <button className="btn btn-danger btn-block" onClick={signOut}>{demo ? t('demo.exit') : t('set.logout')}</button>
    </div>
  );
}
