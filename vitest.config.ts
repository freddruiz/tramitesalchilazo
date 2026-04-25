import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'apps/portal'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    passWithNoTests: true,
    coverage: {
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'build/',
        '.next/',
        '**/*.config.*',
        '**/index.ts',
      ],
    },
  },
});
