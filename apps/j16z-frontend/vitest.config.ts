import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'j16z-frontend',
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
