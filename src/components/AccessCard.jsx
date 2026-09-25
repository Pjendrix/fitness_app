import { useEffect, useState } from 'react';
import { backend } from '../lib/backend.js';
import { FOUNDERS, normEmail, validEmail } from '../lib/access.js';
import { useStore } from '../lib/store.jsx';
import { useDialog } from './Dialog.jsx';
import { TrashIcon } from './Icons.jsx';
import { t } from '../lib/i18n.js';

// Admin: kdo smí appku používat. Každý přidaný účet má vlastní data, šablony i vzhled.
export default function AccessCard() {
  const { notify } = useStore();
  const dialog = useDialog();
  const [list, setList] = useState(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const load = () => backend.access.list().then(setList).catch((e) => { console.error(e); setList([]); notify(t('acc.loadErr')); });
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const add = async () => {
    const e = normEmail(email);
    if (!validEmail(e)) return notify(t('acc.bad'));
    if (FOUNDERS.includes(e) || list?.some((x) => x.email === e)) return notify(t('acc.exists'));
    setBusy(true);
    try { await backend.access.add(e); setEmail(''); notify(t('acc.added', { email: e })); await load(); }
    catch (err) { console.error(err); notify(t('acc.saveErr')); }
    finally { setBusy(false); }
  };
  const remove = async (e) => {
    if (!(await dialog.confirm(t('acc.removeConfirm', { email: e }), { danger: true, ok: t('acc.remove') }))) return;
    try { await backend.access.remove(e); notify(t('acc.removed')); await load(); }
    catch (err) { console.error(err); notify(t('acc.saveErr')); }
  };

  return (
    <section className="card list">
      <div className="row"><span>{t('acc.title')}<span className="muted small row-sub">{t('acc.sub')}</span></span></div>
      <div className="row access-add">
        <input className="input" type="email" inputMode="email" autoComplete="off" placeholder="name@gmail.com" aria-label={t('acc.email')} value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} maxLength={120} />
        <button className="btn btn-primary btn-sm" disabled={busy} onClick={add}>{t('acc.add')}</button>
      </div>
      {FOUNDERS.map((e) => <div key={e} className="row access-row"><span className="mono small">{e}</span><span className="label">{t('acc.founder')}</span></div>)}
      {list === null && <div className="row"><span className="muted small">{t('acc.loading')}</span></div>}
      {list?.map((x) => (
        <div key={x.email} className="row access-row">
          <span className="mono small">{x.email}</span>
          <button className="icon-btn danger" aria-label={t('acc.remove')} onClick={() => remove(x.email)}><TrashIcon width={16} height={16} /></button>
        </div>
      ))}
    </section>
  );
}
