import { expect, test } from '@playwright/test'
import { createProductViaUI, selectOptionRobust, uniqueName } from './helpers'

test('reports index links to both report pages', async ({ page }) => {
  await page.goto('/reports')
  await expect(page.getByRole('heading', { name: 'Матрица: Сегменты × JTBD' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Дашборд пробелов' })).toBeVisible()
})

test('segments × JTBD matrix reflects a confirmed JTBD for its segment/category', async ({
  page,
}) => {
  const productName = uniqueName('Matrix Product')
  const productUrl = await createProductViaUI(page, productName)
  const productId = productUrl.split('/').pop()!

  const segmentName = uniqueName('Matrix Segment')
  await page.goto('/segments/new')
  await page.getByLabel('Название').fill(segmentName)
  await selectOptionRobust(page, page.getByLabel('Продукт'), productName)
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/segments\/[^/]+$/)
  // Same dev-mode HMR/fast-refresh timing hiccup documented on
  // createProductViaUI (helpers.ts) — a segment created a moment ago can be
  // missing from the next page's server-rendered data. Confirming it here,
  // with Playwright's normal retrying assertion, absorbs that before the
  // JTBD form's segment checkbox relies on it being present.
  await expect(page.getByRole('heading', { name: segmentName })).toBeVisible()

  const category = uniqueName('Matrix Category')
  await page.goto('/jtbd/new')
  await page.getByLabel('Формулировка JTBD').fill('Когда я использую матрицу, я хочу видеть покрытие')
  await page.getByLabel('Категория').fill(category)
  await selectOptionRobust(page, page.getByLabel('Продукт'), productName)
  await page.getByLabel(segmentName).check()
  await page.getByLabel('Подтверждено исследованием').check()
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/jtbd\/[^/]+$/)

  // Navigate straight to the matrix for our product via query param rather
  // than clicking through the filter form's product <select> — that
  // interaction has proven unreliable on GET-form filter pages elsewhere in
  // this suite too (see the direct-navigation comment in jtbd-graph.spec.ts).
  await page.goto(`/reports/segments-jtbd?productId=${productId}`)
  await expect(page.getByRole('columnheader', { name: category })).toBeVisible()
  await expect(page.getByText(segmentName)).toBeVisible()
})

test('gaps dashboard lists an unconfirmed JTBD', async ({ page }) => {
  const productName = uniqueName('Gaps Product')
  await createProductViaUI(page, productName)

  const jtbdTitle = uniqueName('Когда я ищу пробел, я хочу его увидеть')
  await page.goto('/jtbd/new')
  await page.getByLabel('Формулировка JTBD').fill(jtbdTitle)
  await page.getByLabel('Категория').fill('Gaps')
  await selectOptionRobust(page, page.getByLabel('Продукт'), productName)
  // "Подтверждено исследованием" left unchecked on purpose.
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/jtbd\/[^/]+$/)

  await page.goto('/reports/gaps')
  await expect(page.getByRole('link', { name: jtbdTitle })).toBeVisible()
})
