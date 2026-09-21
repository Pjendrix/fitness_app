import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' => funguje na Firebase Hosting i GitHub Pages (podadresář)
export default defineConfig({
  base: './',
  plugins: [react()],
});
