import { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import Sheet from './Sheet.jsx';
import { t } from '../lib/i18n.js';

const FORM_URL = 'https://formspree.io/f/xwvjgqav';

// Pruh nahoře v demu: štítek, „Chci vlastní verzi“ (poptávkový formulář) a ukončení dema.
export default function DemoBar() {
  const { mode, signOut } = useStore();
  const [open, setOpen] = useState(false);
  if (mode !== 'demo') return null;
  return (
    <>
      <div className="demo-bar" role="region" aria-label={t('demo.badge')}>
        <span className="demo-tag">{t('demo.badge')}</span>
        <span className="demo-text">{t('demo.local')}</span>
        <span className="spacer" />
        <button className="demo-cta" onClick={() => setOpen(true)}>{t('demo.want')}</button>
        <button className="demo-exit" onClick={signOut} aria-label={t('demo.exit')}>✕</button>
      </div>
      {open && <ContactSheet onClose={() => setOpen(false)} />}
    </>
  );
}

export function ContactSheet({ onClose }) {
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
    <Sheet label={t('demo.formTitle')} onClose={onClose} className="sheet-dialog demo-sheet">
      <h2 className="dlg-title">{t('demo.formTitle')}</h2>
      {state === 'sent' ? (
        <>
          <p className="dlg-msg">{t('demo.sent')}</p>
          <button className="btn btn-primary btn-block" data-autofocus onClick={onClose}>{t('pick.close')}</button>
        </>
      ) : (
        <form className="form" onSubmit={submit}>
          <p className="dlg-msg">{t('demo.formLead')}</p>
          <input type="hidden" name="_subject" value="Forge – zájem o vlastní verzi" />
          <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" className="demo-hp" aria-hidden="true" />
          <label className="mini"><span className="label">{t('demo.name')}</span>
            <input className="input demo-input" name="name" maxLength={80} autoComplete="name" />
          </label>
          <label className="mini"><span className="label">{t('demo.email')} *</span>
            <input className="input demo-input" name="email" type="email" required maxLength={120} autoComplete="email" autoFocus />
          </label>
          <label className="mini"><span className="label">{t('demo.msg')}</span>
            <textarea className="input demo-input" name="message" rows={4} maxLength={2000} placeholder={t('demo.msgPh')} />
          </label>
          {state === 'error' && <p className="login-error" role="alert">{t('demo.sendFail')}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={state === 'sending'}>{state === 'sending' ? t('demo.sending') : t('demo.send')}</button>
        </form>
      )}
    </Sheet>
  );
}
