// Testy Firestore rules – potřebují běžící emulátor (Java). Spouští: npm run test:rules
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node', include: ['tests/rules/**/*.test.js'], testTimeout: 20000, hookTimeout: 30000, fileParallelism: false },
});
