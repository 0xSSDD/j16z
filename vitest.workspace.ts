import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: 'j16z-frontend',
      root: 'apps/j16z-frontend',
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}'],
    },
  },
  {
    test: {
      name: 'j16z-backend',
      root: 'apps/api',
      environment: 'node',
      include: ['src/tests/**/*.test.ts', '!src/tests/cross-tenant.test.ts'],
    },
  },
  {
    test: {
      name: 'isolation',
      root: 'apps/api',
      environment: 'node',
      include: ['src/tests/cross-tenant.test.ts'],
    },
  },
]);
