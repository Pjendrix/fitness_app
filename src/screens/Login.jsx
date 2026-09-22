import { useEffect } from 'react';
import { useStore } from '../lib/store.jsx';
import { GoogleIcon } from '../components/Icons.jsx';
import { syncThemeColor } from '../lib/theme.js';
import { t } from '../lib/i18n.js';

// Přihlášení: černá stránka, logo, jedno tlačítko.
export default function Login() {
  const { signIn, mode, denied, startDemo } = useStore();

  // Černý stavový řádek jen na přihlášení
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', '#000000');
    return () => syncThemeColor();
  }, []);

  return (
    <main className="lx">
      <div className="lx-glow" aria-hidden="true" />
      <div className="lx-center">
        <div className="lx-logo" aria-hidden="true">
          <svg viewBox="0 0 64 64" width="42" height="42" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
            <path d="M18 24v16M10 29v6M46 24v16M54 29v6M18 32h28" />
          </svg>
        </div>
        <h1>Let’s Workout!</h1>
        <button className="lx-btn" onClick={signIn}>
          {mode === 'firebase' ? (<><GoogleIcon /> {t('login.google')}</>) : t('login.demo')}
        </button>
        {mode === 'firebase' && <button className="lx-demo" onClick={startDemo}>{t('login.demoBtn')}</button>}
        {denied && <p className="lx-error" role="alert">{t('login.denied', { email: denied })}</p>}
        {mode === 'demo' && <p className="lx-note">{t('login.demoNote')}</p>}
      </div>
      <p className="lx-foot">FORGE</p>
    </main>
  );
}
