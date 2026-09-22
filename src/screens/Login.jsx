import { useStore } from '../lib/store.jsx';
import { GoogleIcon } from '../components/Icons.jsx';
import { t } from '../lib/i18n.js';

export default function Login() {
  const { signIn, mode, denied } = useStore();
  return (
    <main className="login">
      <div className="login-mark" aria-hidden="true">
        <svg viewBox="0 0 64 64" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
          <path d="M18 26v12M11 30v4M46 26v12M53 30v4M18 32h28" />
        </svg>
      </div>
      <h1>Forge</h1>
      <p className="login-sub">{t('login.sub')}</p>
      <button className="btn btn-primary btn-lg" onClick={signIn}>
        {mode === 'firebase' ? (<><GoogleIcon /> {t('login.google')}</>) : t('login.demo')}
      </button>
      {denied && <p className="login-error" role="alert">{t('login.denied', { email: denied })}</p>}
      {mode === 'demo' && <p className="login-note">{t('login.demoNote')}</p>}
    </main>
  );
}
