import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [tsconfigPaths()],
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts'],
        },
      },
      {
        plugins: [tsconfigPaths()],
        test: {
          name: 'integration',
          environment: 'node',
          include: ['tests/integration/**/*.test.ts'],
          setupFiles: ['tests/integration/setup.ts'],
          // A real Postgres round-trip per test is slower than pure unit tests.
          hookTimeout: 30_000,
          testTimeout: 30_000,
          // Server Actions share one truncated DB; running files in parallel
          // workers would race the truncate-between-tests reset.
          fileParallelism: false,
        },
      },
    ],
  },
})
