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
import { setPref, usePref } from '../lib/prefs.js';

export default function Settings({ go }) {
  const { user, mode, workouts, prs, templates, library, resetLibrary, signOut, deleteAccount, notify, starter, chooseStarter, resetDemo, importData, importBody, body, online, sync } = useStore();
  const demo = mode === 'demo';
  const { lang, setLang } = useLang();
  const { theme, setTheme } = useTheme();
  const dialog = useDialog();
  const [restSec, setRestSec] = useState(getRestDefault);
  const swipeSet = usePref('swipeSet');
  const [showAccess, setShowAccess] = useState(false);

  const exportData = () => {
    download('forge-export.json', JSON.stringify({ exportedAt: new Date().toISOString(), workouts, prs, templates: templates.filter((x) => !x.builtin), library, body }, null, 2), 'application/json');
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
    const nTpl = Array.isArray(json.templates) ? json.templates.filter((x) => x && !x.builtin).length : 0;
    const msg = json.workouts.length ? t('set.importConfirm', { n: json.workouts.length }) : t('set.importTplConfirm', { n: nTpl });
    if (!(await dialog.confirm(msg, { ok: t('set.import') }))) return;
    try {
      const r = await importData(json);
      const b = await importBody(json.body); // E3: tělesná váha ze zálohy (jen chybějící dny)
      notify(t('set.importDone', { w: r.workouts, t: r.templates, e: r.exercises }) + (b ? ` · ${t('body.imported', { n: b })}` : ''), { duration: 6000 });
    } catch (e) { console.error(e); notify(t(e?.message === 'offline' ? 'set.importOffline' : 'set.importBad')); }
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

  // F2: smazání účtu – potvrzení napsáním slova, vyžaduje připojení
  const [deleting, setDeleting] = useState(false);
  const removeAccount = async () => {
    if (!online) return notify(t('del.offline'));
    const word = t('del.word');
    const v = await dialog.form({ title: t('del.title'), message: t('del.msg', { n: workouts.length }), fields: [{ name: 'word', label: t('del.type', { word }), value: '', maxLength: 20, required: true, match: word }], ok: t('del.ok'), danger: true });
    if (!v) return;
    if (v.word.trim().toUpperCase() !== word) return notify(t('del.mismatch', { word }));
    setDeleting(true);
    try {
      const r = await deleteAccount();
      notify(t(r.authDeleted ? 'del.done' : 'del.doneData'), { duration: 8000 });
    } catch (e) {
      console.error(e);
      setDeleting(false);
      if (!['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(e?.code)) notify(t('del.fail', { m: e?.code || e?.message || '?' }), { duration: 8000 });
    }
  };

  return (
    <div className="screen settings">
      <header className="screen-head"><h1>{t('set.title')}</h1></header>

      <section className="card profile">
        {user.photo ? <img src={user.photo} alt="" referrerPolicy="no-referrer" className="avatar" /> : <div className="avatar avatar-fallback">{(user.name || '?')[0]}</div>}
        <div>
          <div>{user.name || t('set.user')}</div>
          <div className="muted small">{demo ? t('demo.local') : user.email}</div>
          {!demo && <div className={'sync-line' + (online ? '' : ' is-off')}><i aria-hidden="true" />{!online ? t('set.offline') : sync.pending ? t('set.syncing') : t('set.synced')}</div>}
        </div>
      </section>

      <h2 className="set-sec">{t('set.secWorkout')}</h2>
      <section className="card list">
        <div className="row row-stack">
          <span>{t('set.rest')}</span>
          <div className="seg seg-sm" role="radiogroup" aria-label={t('set.rest')}>
            {REST_OPTIONS.map((s) => <button key={s} role="radio" aria-checked={restSec === s} className={restSec === s ? 'is-on' : ''} onClick={() => { setRestDefault(s); setRestSec(s); }}>{s ? (s % 60 ? `${s}s` : `${s / 60}m`) : t('rest.off')}</button>)}
          </div>
          <span className="muted small">{restSec ? t('set.restShort') : t('set.restOffHint')}</span>
        </div>
        <div className="row"><span>{t('set.swipe')}<span className="muted small row-sub">{t('set.swipeShort')}</span></span>
          <button type="button" className="switch" role="switch" aria-checked={swipeSet} aria-label={t('set.swipe')} onClick={() => setPref('swipeSet', !swipeSet)} />
        </div>
      </section>

      <h2 className="set-sec">{t('look.title')}</h2>
      <section className="card list">
        <div className="row"><span>{t('set.lang')}</span>
          <div className="seg seg-sm seg-inline" role="radiogroup" aria-label={t('set.lang')}>
            {[['en', 'EN'], ['cs', 'CS']].map(([id, l]) => <button key={id} role="radio" aria-checked={lang === id} aria-label={id === 'en' ? 'English' : 'Čeština'} className={lang === id ? 'is-on' : ''} onClick={() => setLang(id).catch(() => notify(t('set.langFail')))}>{l}</button>)}
          </div>
        </div>
        <div className="row"><span>{t('set.theme')}</span>
          <div className="seg seg-sm seg-inline" role="radiogroup" aria-label={t('set.theme')}>
            {['light', 'dark', 'auto'].map((id) => <button key={id} role="radio" aria-checked={theme === id} className={theme === id ? 'is-on' : ''} onClick={() => setTheme(id)}>{t('theme.' + id)}</button>)}
          </div>
        </div>
        <div className="row"><span>{t('set.view')}</span><ViewToggle full short /></div>
        <AppearanceCard embedded />
      </section>

      <h2 className="set-sec">{t('set.secData')}</h2>
      <section className="card list">
        <button className="row row-link" onClick={() => go('exercises')}><span>{t('set.library')}</span><span className="muted">{library.length} ›</span></button>
        <div className="row"><span>{t('set.backup')}<span className="muted small row-sub">{t('set.backupShort')}</span></span>
          <span className="row-end">
            <button className="btn btn-ghost btn-sm" onClick={exportData}>{t('set.exportShort')}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>{t('set.import')}</button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImport} />
          </span>
        </div>
      </section>

      <h2 className="set-sec">{t('set.secAccount')}</h2>
      <section className="card list">
        {!demo && isAdmin(user.email) && backend.access && (
          <button className="row row-link" aria-expanded={showAccess} onClick={() => setShowAccess(!showAccess)}><span>{t('acc.title')}</span><span className="muted">admin {showAccess ? '⌃' : '›'}</span></button>
        )}
        <div className="row"><span>{t('set.danger')}<span className="muted small row-sub">{t('set.resetShort')}</span></span>
          <span className="row-end">
            <button className="btn btn-ghost btn-sm" onClick={reset}>{t('set.resetLib')}</button>
            <button className="btn btn-ghost btn-sm" onClick={resetTemplates}>{t('set.resetTplShort')}</button>
          </span>
        </div>
        {demo && (
          <div className="row"><span>{t('demo.reset')}</span>
            <button className="btn btn-ghost btn-sm dz" onClick={async () => { if (await dialog.confirm(t('demo.resetConfirm'), { danger: true, ok: t('demo.reset') })) resetDemo(); }}>{t('demo.resetBtn')}</button>
          </div>
        )}
        {!demo && (
          <div className="row"><span>{t('del.section')}</span>
            <button className="btn btn-ghost btn-sm dz" disabled={deleting} onClick={removeAccount}>{deleting ? t('del.busy') : t('del.short')}</button>
          </div>
        )}
      </section>
      {showAccess && <AccessCard />}

      <button className="btn btn-danger btn-block set-logout" onClick={signOut}>{demo ? t('demo.exit') : t('set.logout')}</button>
      <p className="muted small legal-links"><a href="./privacy.html" target="_blank" rel="noopener">{t('legal.privacy')}</a></p>
    </div>
  );
}
