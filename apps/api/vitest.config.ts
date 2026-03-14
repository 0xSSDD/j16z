import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.ts', '!src/tests/cross-tenant.test.ts'],
    setupFiles: ['src/tests/setup-env.ts'],
    globals: true,
    testTimeout: 30000, // 30s for integration tests
  },
});
