import { useStore } from '../lib/store.jsx';
import { GoogleIcon } from '../components/Icons.jsx';

export default function Login() {
  const { signIn, mode } = useStore();
  return (
    <main className="login">
      <div className="login-mark" aria-hidden="true">
        <svg viewBox="0 0 64 64" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
          <path d="M18 26v12M11 30v4M46 26v12M53 30v4M18 32h28" />
        </svg>
      </div>
      <h1>Forge</h1>
      <p className="login-sub">Zapisuj série, sleduj rekordy. Šablony PUSH, PULL a LEGS jsou připravené.</p>
      <button className="btn btn-primary btn-lg" onClick={signIn}>
        {mode === 'firebase' ? (<><GoogleIcon /> Přihlásit přes Google</>) : 'Vstoupit do demo režimu'}
      </button>
      {mode === 'demo' && (
        <p className="login-note">Firebase zatím není nastavený. Data se ukládají jen v tomto prohlížeči (viz README).</p>
      )}
    </main>
  );
}
