import { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import Sheet from './Sheet.jsx';
import { t } from '../lib/i18n.js';

const FORM_URL = 'https://formspree.io/f/xwvjgqav';

// Pruh nahoře v demu / trialu: štítek, poptávka (demo: vlastní verze, trial: žádost o přístup) a odchod.
export default function DemoBar() {
  const { mode, signOut } = useStore();
  const [open, setOpen] = useState(false);
  if (mode !== 'demo' && mode !== 'trial') return null;
  const trial = mode === 'trial';
  return (
    <>
      <div className={'demo-bar' + (trial ? ' is-trial' : '')} role="region" aria-label={t(trial ? 'trial.badge' : 'demo.badge')}>
        <span className="demo-tag">{t(trial ? 'trial.badge' : 'demo.badge')}</span>
        <span className="demo-text">{t(trial ? 'trial.local' : 'demo.local')}</span>
        <span className="spacer" />
        <button className="demo-cta" onClick={() => setOpen(true)}>{t(trial ? 'trial.request' : 'demo.want')}</button>
        <button className="demo-exit" onClick={signOut} aria-label={t(trial ? 'trial.exit' : 'demo.exit')}>✕</button>
      </div>
      {open && <ContactSheet kind={trial ? 'access' : 'offer'} onClose={() => setOpen(false)} />}
    </>
  );
}

// kind: 'offer' = vlastní verze Forge (demo), 'access' = žádost o přístup do této appky (trial)
export function ContactSheet({ onClose, kind = 'offer' }) {
  const access = kind === 'access';
  const [state, setState] = useState('idle'); // idle | sending | sent | error
  const submit = async (e) => {
    e.preventDefault();
    setState('sending');
    try {
      const res = await fetch(FORM_URL, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(e.currentTarget) });
      setState(res.ok ? 'sent' : 'error');
    } catch {
      setState('error');
    }
  };
  return (
    <Sheet label={t(access ? 'trial.formTitle' : 'demo.formTitle')} onClose={onClose} className="sheet-dialog demo-sheet">
      <h2 className="dlg-title">{t(access ? 'trial.formTitle' : 'demo.formTitle')}</h2>
      {state === 'sent' ? (
        <>
          <p className="dlg-msg">{t(access ? 'trial.sent' : 'demo.sent')}</p>
          <button className="btn btn-primary btn-block" data-autofocus onClick={onClose}>{t('pick.close')}</button>
        </>
      ) : (
        <form className="form" onSubmit={submit}>
          <p className="dlg-msg">{t(access ? 'trial.formLead' : 'demo.formLead')}</p>
          <input type="hidden" name="_subject" value={access ? 'Forge – žádost o přístup' : 'Forge – zájem o vlastní verzi'} />
          {access && <input type="hidden" name="type" value="access" />}
          <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" className="demo-hp" aria-hidden="true" />
          <label className="mini"><span className="label">{t('demo.name')}</span>
            <input className="input demo-input" name="name" maxLength={80} autoComplete="name" />
          </label>
          <label className="mini"><span className="label">{t(access ? 'trial.email' : 'demo.email')} *</span>
            <input className="input demo-input" name="email" type="email" required maxLength={120} autoComplete="email" autoFocus />
          </label>
          <label className="mini"><span className="label">{t('demo.msg')}</span>
            <textarea className="input demo-input" name="message" rows={4} maxLength={2000} placeholder={t(access ? 'trial.msgPh' : 'demo.msgPh')} />
          </label>
          {state === 'error' && <p className="login-error" role="alert">{t('demo.sendFail')}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={state === 'sending'}>{state === 'sending' ? t('demo.sending') : t('demo.send')}</button>
        </form>
      )}
    </Sheet>
  );
}
