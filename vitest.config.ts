import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    globals: true,
    environment: 'node',
    testTimeout: 60000, // 60s for infrastructure tests
    hookTimeout: 30000,
    // Verbose output în terminal + JSON pentru CI
    reporters: ['default', 'verbose'],
    outputFile: {
      json: './test-results/vitest-results.json',
    },
    // Afișează progresul în timp real
    watch: false,
    // Afișează console.log din teste
    printConsoleTrace: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
    },
  },
});
