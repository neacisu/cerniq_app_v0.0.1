import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    globals: true,
    environment: 'node',
    testTimeout: 60000, // 60s for infrastructure tests
    hookTimeout: 30000,
    reporters: ['verbose', 'json'],
    outputFile: {
      json: './test-results/vitest-results.json',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
    },
  },
});
