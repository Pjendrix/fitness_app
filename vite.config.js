import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// base './' → funguje na Vercelu i v podadresáři
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // nová verze → banner „Obnovit“ (UpdatePrompt.jsx)
      injectRegister: false,
      filename: 'sw.js', // stejný název jako dřív → nainstalované PWA se samo přepne na nový SW
      manifest: false, // používáme public/manifest.webmanifest
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/__\//], // Firebase auth handler nikdy z cache
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Databáze cviků + fotky (free-exercise-db) – offline po prvním otevření
            urlPattern: /^https:\/\/raw\.githubusercontent\.com\/yuhonas\/free-exercise-db\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'exercise-db', cacheableResponse: { statuses: [0, 200] }, expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 60 } },
          },
          {
            urlPattern: /^https:\/\/lh3\.googleusercontent\.com\//, // profilová fotka
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'avatars', cacheableResponse: { statuses: [0, 200] }, expiration: { maxEntries: 5 } },
          },
        ],
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 700, // Firebase (Auth + Firestore s offline cache) má ~570 kB, cachuje se samostatně
    // Vite 8 (Rolldown): Firebase a React zvlášť – změna UI nezneplatní velké vendor chunky v cache
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'firebase', test: /node_modules[\\/](@firebase|firebase)[\\/]/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
          ],
        },
      },
    },
  },
  test: { environment: 'node', include: ['src/**/*.test.js'] },
});
