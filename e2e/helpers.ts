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

/**
 * Активный продукт живёт в cookie (фаза 4 редизайна 2.1,
 * lib/product-context.ts). Спеки создают продукт и сразу идут в раздел — без
 * этой фикстуры активным остался бы первый по алфавиту продукт из общей
 * тестовой базы, и список отфильтровал бы только что созданную запись.
 */
export async function setActiveProduct(page: Page, productId: string) {
  await page.context().addCookies([
    {
      name: 'rpm_active_product',
      value: productId,
      url: page.url().startsWith('http') ? new URL(page.url()).origin : 'http://localhost:3100',
    },
  ])
}

/** id продукта из его URL вида /products/<id>. */
export function productIdFromUrl(url: string): string {
  return new URL(url).pathname.split('/').filter(Boolean)[1]
}

export async function createProductViaUI(page: Page, name: string): Promise<string> {
  await page.goto('/products/new')
  await page.getByLabel('Название').fill(name)
  await page.getByRole('button', { name: 'Создать', exact: true }).click()
  await page.waitForURL(/\/products\/c[a-z0-9]{10,}$/)
  // Next dev-mode has occasionally shown a freshly created record missing
  // from the very next page's server-rendered <select> (looks like a dev-only
  // HMR/fast-refresh timing hiccup, not a real data-consistency bug — the
  // detail page we just landed on already proves the row exists). Confirming
  // it renders here, with Playwright's normal retrying assertion, absorbs
  // that instead of letting it surface as a flaky failure deeper in a spec.
  await expect(page.getByRole('heading', { name })).toBeVisible()
  // Только что созданный продукт становится активным — так же, как это
  // делает форма в браузере (ProductForm пишет cookie после сохранения).
  await setActiveProduct(page, productIdFromUrl(page.url()))
  return page.url()
}

/**
 * components/ui/select.tsx is a Radix Select (Фаза 2, plans/archive/visual-redesign-plan.md)
 * — a styled trigger button + a portal-rendered listbox, not a native
 * <select>, so Playwright's built-in `.selectOption()` doesn't apply. Click
 * the trigger (found by its label same as before), then click the matching
 * `role="option"` — Radix renders the listbox in a portal appended to
 * <body>, which `page.getByRole` reaches regardless of where the trigger
 * itself lives in the tree.
 */
export async function selectRadixOption(
  page: Page,
  trigger: ReturnType<Page['getByLabel']>,
  optionLabel: string
): Promise<void> {
  await trigger.click()
  await page.getByRole('option', { name: optionLabel, exact: true }).click()
}

/**
 * Same as selectRadixOption, but reopens the trigger and retries (reloading
 * the page first) a few times if the option isn't there yet. Next dev-mode
 * has occasionally shown a record created moments earlier missing from the
 * very next page's server-rendered options — reproducible only mid-suite,
 * never in isolation, and never for data that's had more than a beat to
 * settle, which points at a dev-server HMR/fast-refresh timing hiccup rather
 * than a real data-consistency bug (the write itself is already covered
 * directly by the integration test suite).
 */
export async function selectOptionRobust(
  page: Page,
  trigger: ReturnType<Page['getByLabel']>,
  optionLabel: string
): Promise<void> {
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) {
      await page.reload()
      await page.waitForTimeout(300)
    }
    await trigger.click()
    const option = page.getByRole('option', { name: optionLabel, exact: true })
    const found = await option.count().then((n) => n > 0)
    if (found) {
      await option.click()
      return
    }
    await page.keyboard.press('Escape')
  }
  // Let the normal click/timeout error fire with its usual diagnostics if
  // still missing after retrying.
  await trigger.click()
  await page.getByRole('option', { name: optionLabel, exact: true }).click()
}

/**
 * Deleting is now two steps: the trigger opens a dialog that counts what the
 * cascade would take (plans/2.0-hardening-plan.md, B4), and the confirm lives
 * inside it. The specs used to accept a native `confirm()` with
 * `page.once('dialog', ...)`, which silently does nothing now.
 *
 * `trigger` is the button that opens the dialog — pass a scoped locator when
 * the page has several (a row's delete vs. the page header's).
 */
export async function confirmDelete(
  page: Page,
  trigger: ReturnType<Page['getByRole']> = page.getByRole('button', { name: 'Удалить' })
): Promise<void> {
  await trigger.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  // Waits out the count: the dialog opens before getDeleteImpact resolves,
  // and a spec that confirms instantly would never exercise the numbers.
  await expect(dialog.getByText('Считаем связанные записи...')).toHaveCount(0)
  await dialog.getByRole('button', { name: /^(Удалить|Убрать)$/ }).click()
}

/**
 * Finds a record by its full text where the UI shows only a key phrase.
 *
 * List and card views lead with the informative clause of a templated record
 * (lib/key-phrase.ts), so «Если …, то …» loses its tail on screen — and
 * uniqueName() puts its unique suffix exactly there. The untouched text is
 * always kept in the element's `title`, which is both the stable anchor for a
 * spec and the tooltip contract worth asserting.
 */
export function byFullText(page: Page, fullText: string) {
  return page.locator(`[title="${fullText}"]`)
}
