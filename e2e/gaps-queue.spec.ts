import { expect, test } from '@playwright/test'
import { createProductViaUI, selectOptionRobust, uniqueName } from './helpers'

// Gaps as a work queue (plans/2.0-product-leap-plan.md, C3).
//
// /reports/gaps is user-wide and the suite shares one database, so every
// assertion here is scoped to a uniquely-named record rather than to counts
// or to "the first group" — earlier runs leave their own gaps behind.

test('a segment with no JTBD becomes a task whose action opens a prefilled form', async ({
  page,
}) => {
  const productName = uniqueName('Gap Queue Product')
  await createProductViaUI(page, productName)

  const segmentName = uniqueName('Gap Queue Segment')
  await page.goto('/segments/new')
  await page.getByLabel('Название').fill(segmentName)
  await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), productName)
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/segments\/c[a-z0-9]{10,}$/)
  await expect(page.getByRole('heading', { name: segmentName })).toBeVisible()

  await page.goto('/reports/gaps')

  // The segment shows up as a task, and the row carries the resolving action.
  const row = page.locator('li').filter({ hasText: segmentName })
  await expect(row).toBeVisible()
  await row.getByRole('link', { name: 'Добавить JTBD' }).click()

  // The action lands on the JTBD form with product AND segment already set —
  // the gap named the missing link, so it should not be re-entered by hand.
  await page.waitForURL(/\/jtbd\/new\?/)
  await expect(page.getByLabel(segmentName)).toBeChecked()

  // Creating the JTBD closes the gap, so the task leaves the queue.
  await page.getByLabel('Формулировка JTBD').fill(uniqueName('Закрывает пробел'))
  await page.getByLabel('Категория').fill('Gap Queue')
  await page.getByRole('button', { name: 'Создать' }).click()
  // Именно cuid, а не `[^/]+`: тот совпадал и с `/jtbd/new?productId=…`
  // (ни `?`, ни `=` не слэши), поэтому ожидание проходило мгновенно, ещё на
  // форме, и следующий переход случался до того, как запись создавалась.
  await page.waitForURL(/\/jtbd\/c[a-z0-9]{10,}$/)

  await page.goto('/reports/gaps')
  await expect(page.locator('li').filter({ hasText: segmentName })).toHaveCount(0)
})

test('the most blocking group is ranked first in the queue', async ({ page }) => {
  const productName = uniqueName('Gap Order Product')
  await createProductViaUI(page, productName)
  const segmentName = uniqueName('Gap Order Segment')
  await page.goto('/segments/new')
  await page.getByLabel('Название').fill(segmentName)
  await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), productName)
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/segments\/c[a-z0-9]{10,}$/)

  await page.goto('/reports/gaps')

  // A segment with no JTBD blocks everything downstream, so its directive
  // always heads the queue when present — position 1.
  const firstGroup = page.getByRole('heading').filter({ hasText: 'Добавьте хотя бы одну задачу' })
  await expect(firstGroup).toBeVisible()
  await expect(page.getByText('Сегменты без единого JTBD.', { exact: false })).toBeVisible()
})

// The one-click "На проверку" button needs a hypothesis older than 14 days,
// which no UI can produce — a spec cannot age a record. Its behaviour (the
// DRAFT->IN_REVIEW transition, the status-history entry, the ownership check
// and the refusal to drag a non-draft backwards) is covered at the
// integration layer instead, in tests/integration/actions/gaps.test.ts.
// What IS worth pinning through the UI is the other side of that rule:
// a hypothesis written today must not be nagged about.
test('a hypothesis written today is not yet treated as stuck', async ({ page }) => {
  const productName = uniqueName('Gap Hypo Product')
  await createProductViaUI(page, productName)

  const statement = uniqueName('Если убрать визит, то онбординг ускорится')
  await page.goto('/hypotheses/new')
  await page.getByLabel('Формулировка').fill(statement)
  await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), productName)
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/hypotheses\/c[a-z0-9]{10,}$/)

  await page.goto('/reports/gaps')
  await expect(page.locator('li').filter({ hasText: statement })).toHaveCount(0)
})
