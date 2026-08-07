import { expect, type Page } from '@playwright/test'

/**
 * E2E specs run sequentially against one shared Postgres database (no
 * per-spec reset) — every created record uses a name unique to the run so
 * specs can find their own data without colliding with each other or with
 * leftovers from a previous run.
 */
export function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export async function createProductViaUI(page: Page, name: string): Promise<string> {
  await page.goto('/products/new')
  await page.getByLabel('Название').fill(name)
  await page.getByRole('button', { name: 'Создать', exact: true }).click()
  await page.waitForURL(/\/products\/[^/]+$/)
  // Next dev-mode has occasionally shown a freshly created record missing
  // from the very next page's server-rendered <select> (looks like a dev-only
  // HMR/fast-refresh timing hiccup, not a real data-consistency bug — the
  // detail page we just landed on already proves the row exists). Confirming
  // it renders here, with Playwright's normal retrying assertion, absorbs
  // that instead of letting it surface as a flaky failure deeper in a spec.
  await expect(page.getByRole('heading', { name })).toBeVisible()
  return page.url()
}

/**
 * Selects an option by label, reloading the page a few times first if the
 * option isn't there yet. Next dev-mode has occasionally shown a record
 * created moments earlier missing from the very next page's server-rendered
 * <select> — reproducible only mid-suite, never in isolation, and never for
 * data that's had more than a beat to settle, which points at a dev-server
 * HMR/fast-refresh timing hiccup rather than a real data-consistency bug (the
 * write itself is already covered directly by the integration test suite).
 */
export async function selectOptionRobust(
  page: Page,
  select: ReturnType<Page['getByLabel']>,
  label: string
): Promise<void> {
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) {
      await page.reload()
      await page.waitForTimeout(300)
    }
    const found = await select
      .locator('option', { hasText: label })
      .count()
      .then((n) => n > 0)
    if (found) {
      await select.selectOption({ label })
      return
    }
  }
  // Let the normal selectOption timeout/error fire with its usual diagnostics
  // if it's still missing after retrying.
  await select.selectOption({ label })
}
