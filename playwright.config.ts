import { config } from 'dotenv'

// .env.test must win over the root .env's dev-database DATABASE_URL —
// `override: true` is load-bearing, see tests/integration/setup.ts for why.
config()
config({ path: '.env.test', override: true })

import { defineConfig, devices } from '@playwright/test'

const PORT = 3100
const baseURL = `http://localhost:${PORT}`

if (process.env.DATABASE_URL && !/rpm_platform_test|test/i.test(process.env.DATABASE_URL)) {
  throw new Error(
    `DATABASE_URL ("${process.env.DATABASE_URL}") doesn't look like a test database ` +
      '(expected "test" in the name). Refusing to run — E2E specs create and delete real records.'
  )
}

export default defineConfig({
  testDir: './e2e',
  globalSetup: require.resolve('./e2e/global-setup.ts'),
  // 90 с, а не 30. Причина замерена, а не предположена: набор гоняется против
  // `next dev` (см. webServer ниже), и первое обращение к маршруту включает его
  // компиляцию. У четырёх самых тяжёлых спеков — accessibility (обходит все
  // страницы-списки за один тест), cpo, marketing-hub, sales-hub — она
  // стабильно не укладывалась в 30 с: на первой попытке тайм-аут, на ретрае
  // зелено, и так каждый прогон. `cpo.spec.ts` в одиночку идёт ~2,6 минуты и с
  // `--timeout=120000` проходит с первого раза.
  //
  // То есть 30 с меряли скорость компилятора, а не поведение приложения, и
  // «5 flaky» в каждом отчёте были шумом, за которым легко пропустить
  // настоящую регрессию. `expect.timeout` намеренно остаётся 8 с: ожидание
  // конкретного элемента на уже открытой странице — это как раз про
  // приложение, и растягивать его значило бы прятать медленный ответ.
  timeout: 90_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  // Specs share one Postgres test DB (no per-spec namespacing yet, see
  // plans/inspirations.md-style scoping notes) — running workers in parallel
  // would race each other's data.
  workers: 1,
  // `next dev`'s on-demand compile can still stall an occasional first hit
  // to an uncommon route/param combination even after the global warmup —
  // one retry absorbs that without masking a real failure (it would fail
  // again identically on retry).
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Unset outside local dev sandboxes that pin a specific pre-installed
        // Chromium build (see the repo's environment docs, if any) — never
        // required for a normal `npx playwright install` setup or in CI.
        ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } }
          : {}),
      },
    },
  ],
  webServer: {
    // Runs against `next dev`, not a production build: Next's static-export
    // step (for the handful of non-force-dynamic pages) uses a worker-process
    // pool that has proven flaky specifically when spawned via Playwright's
    // process manager in sandboxed/constrained containers, even though a
    // plain `npm run build` succeeds reliably run directly. `next build`
    // itself is still verified standalone in CI (see .github/workflows/ci.yml)
    // — this just keeps the E2E run itself unaffected by that flakiness.
    command: `npm run dev -- -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? '',
      NEXTAUTH_URL: baseURL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? 'e2e-test-secret',
    },
  },
})
