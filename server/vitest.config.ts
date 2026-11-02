import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 20_000,
    env: {
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/unused-in-unit-tests',
      JWT_SECRET: 'test-secret-test-secret-test-secret-test-secret',
      CLIENT_ORIGIN: 'http://localhost:3000',
    },
  },
});
