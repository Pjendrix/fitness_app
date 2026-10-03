import { useEffect, useState } from 'react';
import { backend } from '../lib/backend.js';
import { useDialog } from './Dialog.jsx';
import { fmtDate } from '../lib/util.js';
import { t } from '../lib/i18n.js';

// Admin: posledních 30 chyb z telefonů všech účtů (errors/{auto}). Kdo, kdy, kde a zpráva; rozbalením stack.
export default function ErrorLogCard() {
  const dialog = useDialog();
  const [list, setList] = useState(null);
  const load = () => backend.errors.list().then(setList).catch((e) => { console.error(e); setList([]); });
  useEffect(() => { load(); }, []);
  const clear = async () => {
    if (!(await dialog.confirm(t('err.logClearConfirm'), { danger: true, ok: t('err.logClear') }))) return;
    await backend.errors.clear().catch(console.error);
    load();
  };
  return (
    <section className="card list errlog">
      <div className="card-head errlog-head"><h2>{t('err.logTitle')}</h2>{list?.length > 0 && <button className="link" onClick={clear}>{t('err.logClear')}</button>}</div>
      {list === null && <p className="muted small">…</p>}
      {list?.length === 0 && <p className="muted small errlog-empty">{t('err.logEmpty')}</p>}
      {list?.map((e) => (
        <details key={e.id} className="row errlog-row">
          <summary>
            <span className="mono small">{e.msg}</span>
            <span className="muted small">{fmtDate(e.at)} {new Date(e.at).toLocaleTimeString().slice(0, 5)} · {e.where} · v{e.ver} · {e.uid.slice(0, 6)}</span>
          </summary>
          {e.stack && <pre className="errlog-stack">{e.stack}</pre>}
          {e.ua && <p className="muted small">{e.ua}</p>}
        </details>
      ))}
    </section>
  );
}
