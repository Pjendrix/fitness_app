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

createRoot(document.getElementById('root')).render(<App />);

// Úklid cache ze starého ručního service workeru (nový SW generuje vite-plugin-pwa / Workbox)
if ('caches' in window) caches.keys().then((keys) => keys.filter((k) => k.startsWith('forge-v')).forEach((k) => caches.delete(k))).catch(() => {});
