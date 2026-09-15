import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { configDefaults, defineConfig } from 'vitest/config';

const DEDICATED_ACCEPTANCE_TESTS = [
  '**/kairaSeededComplexConversationLongSessionRegression.test.ts',
  '**/kairaSeededAdversarialConversationExploration.test.ts',
] as const;

const explicitDedicatedAcceptanceRun = process.argv.some((arg) =>
  DEDICATED_ACCEPTANCE_TESTS.some((pattern) =>
    arg.includes(pattern.replace('**/', '')),
  ),
);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    exclude: explicitDedicatedAcceptanceRun
      ? configDefaults.exclude
      : [...configDefaults.exclude, ...DEDICATED_ACCEPTANCE_TESTS],
  },
});
