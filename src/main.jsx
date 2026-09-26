import { createRoot } from 'react-dom/client';
import '@fontsource/geist-sans/400.css';
import '@fontsource/geist-sans/500.css';
import '@fontsource/geist-sans/600.css';
import '@fontsource/geist-mono/400.css';
import '@fontsource/geist-mono/500.css';
import App from './App.jsx';
import './styles.css';
import './lib/viewMode.js';
import './lib/theme.js';
import { loadLang } from './lib/i18n.js';

// Čeština se dotáhne před prvním vykreslením (z cache service workeru okamžitě); při chybě angličtina
const root = createRoot(document.getElementById('root'));
loadLang().catch(() => {}).finally(() => root.render(<App />));

// Úklid cache ze starého ručního service workeru (nový SW generuje vite-plugin-pwa / Workbox)
if ('caches' in window) caches.keys().then((keys) => keys.filter((k) => k.startsWith('forge-v')).forEach((k) => caches.delete(k))).catch(() => {});
