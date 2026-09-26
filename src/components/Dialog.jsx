import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import Sheet from './Sheet.jsx';
import { t } from '../lib/i18n.js';

// Vlastní potvrzovací dialogy místo window.confirm / prompt (v iOS PWA vypadají cize a blokují UI).
// const dialog = useDialog();
//   await dialog.confirm(message, { danger, ok })              → true / false
//   await dialog.choose({ title, message, actions: [{ value, label, primary, danger }] }) → value | null
//   await dialog.form({ title, message?, ok?, danger?, fields: [{ name, label, value, maxLength, required, match? }] }) → { name: value } | null
//     match = pole musí obsahovat přesně tohle slovo (bez ohledu na velikost písmen), jinak nejde potvrdit
const Ctx = createContext(null);
export const useDialog = () => useContext(Ctx);

export function DialogProvider({ children }) {
  const [dlg, setDlg] = useState(null);
  const open = useCallback((spec) => new Promise((resolve) => setDlg({ ...spec, resolve })), []);
  const close = (value) => { dlg?.resolve(value); setDlg(null); };

  const api = useMemo(() => ({
    choose: (spec) => open({ kind: 'choose', ...spec }),
    confirm: (message, { danger = false, ok, title } = {}) =>
      open({ kind: 'choose', title, message, actions: [{ value: false, label: t('dlg.cancel') }, { value: true, label: ok || t('dlg.confirm'), primary: !danger, danger }] }).then(Boolean),
    form: (spec) => open({ kind: 'form', ...spec }),
  }), [open]);

  return (
    <Ctx.Provider value={api}>
      {children}
      {dlg && (dlg.kind === 'form' ? <FormDialog dlg={dlg} close={close} /> : <ChooseDialog dlg={dlg} close={close} />)}
    </Ctx.Provider>
  );
}

function ChooseDialog({ dlg, close }) {
  const cancel = dlg.actions.find((a) => a.value === null || a.value === false);
  return (
    <Sheet label={dlg.title || dlg.message} onClose={() => close(cancel ? cancel.value : null)} className="sheet-dialog">
      {dlg.title && <h2 className="dlg-title">{dlg.title}</h2>}
      {dlg.message && <p className="dlg-msg">{dlg.message}</p>}
      <div className="dlg-actions">
        {dlg.actions.map((a, i) => (
          <button key={i} data-autofocus={a === cancel ? '' : undefined}
            className={'btn btn-block ' + (a.danger ? 'btn-danger-solid' : a.primary ? 'btn-primary' : 'btn-ghost')}
            onClick={() => close(a.value)}>{a.label}</button>
        ))}
      </div>
    </Sheet>
  );
}

function FormDialog({ dlg, close }) {
  const [vals, setVals] = useState(() => Object.fromEntries(dlg.fields.map((f) => [f.name, f.value ?? ''])));
  const ok = dlg.fields.every((f) => (!f.required || String(vals[f.name]).trim()) && (!f.match || String(vals[f.name]).trim().toUpperCase() === f.match.toUpperCase()));
  const submit = (e) => { e.preventDefault(); if (ok) close(vals); };
  return (
    <Sheet label={dlg.title} onClose={() => close(null)} className="sheet-dialog">
      <h2 className="dlg-title">{dlg.title}</h2>
      {dlg.message && <p className="dlg-msg">{dlg.message}</p>}
      <form className="form" onSubmit={submit}>
        {dlg.fields.map((f, i) => (
          <label key={f.name} className="mini">
            <span className="label">{f.label}</span>
            <input className="input" autoFocus={i === 0} autoComplete="off" autoCapitalize={f.match ? 'characters' : undefined} maxLength={f.maxLength || 80} value={vals[f.name]} onChange={(e) => setVals((v) => ({ ...v, [f.name]: e.target.value }))} />
          </label>
        ))}
        <div className="dlg-actions">
          <button type="button" className="btn btn-ghost btn-block" onClick={() => close(null)}>{t('dlg.cancel')}</button>
          <button type="submit" className={'btn btn-block ' + (dlg.danger ? 'btn-danger-solid' : 'btn-primary')} disabled={!ok}>{dlg.ok || t('dlg.save')}</button>
        </div>
      </form>
    </Sheet>
  );
}
