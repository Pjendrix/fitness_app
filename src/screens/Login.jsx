import { useStore } from '../lib/store.jsx';
import { GoogleIcon } from '../components/Icons.jsx';
import { t, useLang } from '../lib/i18n.js';

const Mark = ({ size = 18 }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" aria-hidden="true">
    <path d="M18 26v12M11 30v4M46 26v12M53 30v4M18 32h28" />
  </svg>
);

// Dekorativní náhled appky (jen vizuál, bez dat)
function Preview() {
  const bars = [3, 4, 2, 4, 5, 3, 4, 5];
  return (
    <div className="lp-preview" aria-hidden="true">
      <div className="lp-card lp-card-main">
        <div className="lp-row"><span className="lp-mono">{t('login.pvExercise')}</span><span className="lp-pill">PR</span></div>
        <div className="lp-big">102.5<small> kg × 5</small></div>
        <svg viewBox="0 0 240 64" className="lp-spark" preserveAspectRatio="none">
          <path d="M0 52 L30 48 L60 50 L90 40 L120 36 L150 38 L180 26 L210 22 L240 12" />
          <path d="M0 52 L30 48 L60 50 L90 40 L120 36 L150 38 L180 26 L210 22 L240 12 L240 64 L0 64 Z" className="lp-spark-fill" />
        </svg>
        <div className="lp-row lp-foot"><span className="lp-mono">{t('login.pvTrend')}</span><span className="lp-mono lp-up">+12.5 kg</span></div>
      </div>
      <div className="lp-card lp-card-side">
        <span className="lp-mono">{t('login.pvWeek')}</span>
        <div className="lp-bars">{bars.map((b, i) => <i key={i} style={{ height: `${b * 18}%` }} className={b >= 4 ? 'on' : ''} />)}</div>
      </div>
    </div>
  );
}

export default function Login() {
  const { signIn, mode, denied } = useStore();
  const { lang, setLang } = useLang();
  const features = [1, 2, 3];
  return (
    <div className="lp">
      <div className="lp-grid" aria-hidden="true" />
      <header className="lp-top">
        <span className="lp-brand"><span className="lp-mark"><Mark /></span>Forge</span>
        <div className="lp-lang" role="radiogroup" aria-label={t('set.lang')}>
          {['en', 'cs'].map((l) => (
            <button key={l} role="radio" aria-checked={lang === l} className={lang === l ? 'is-on' : ''} onClick={() => setLang(l)}>{l.toUpperCase()}</button>
          ))}
        </div>
      </header>

      <main className="lp-main">
        <section className="lp-hero">
          <p className="lp-eyebrow"><i />{t('login.eyebrow')}</p>
          <h1>{t('login.title1')}<br /><span>{t('login.title2')}</span></h1>
          <p className="lp-sub">{t('login.sub')}</p>
          <div className="lp-cta">
            <button className="btn btn-primary btn-lg lp-btn" onClick={signIn}>
              {mode === 'firebase' ? (<><GoogleIcon /> {t('login.google')}</>) : t('login.demo')}
            </button>
            <span className="lp-hint">{t('login.secure')}</span>
          </div>
          {denied && <p className="login-error" role="alert">{t('login.denied', { email: denied })}</p>}
          {mode === 'demo' && <p className="login-note">{t('login.demoNote')}</p>}
        </section>
        <Preview />
      </main>

      <section className="lp-features" aria-label={t('login.featuresAria')}>
        {features.map((n) => (
          <div key={n} className="lp-feature">
            <span className="lp-mono">0{n}</span>
            <h2>{t(`login.f${n}`)}</h2>
            <p>{t(`login.f${n}d`)}</p>
          </div>
        ))}
      </section>

      <footer className="lp-footer"><span>{t('login.footer')}</span><span className="lp-mono">© {new Date().getFullYear()} Forge</span></footer>
    </div>
  );
}
