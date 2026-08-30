import { expect, test } from '@playwright/test'
import { byFullText, createProductViaUI, selectOptionRobust, uniqueName } from './helpers'

test('reports index links to both report pages', async ({ page }) => {
  await page.goto('/reports')
  await expect(page.getByRole('heading', { name: 'Матрица: Сегменты × JTBD' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Пробелы: что делать дальше' })).toBeVisible()
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
  await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), productName)
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/segments\/c[a-z0-9]{10,}$/)
  // Same dev-mode HMR/fast-refresh timing hiccup documented on
  // createProductViaUI (helpers.ts) — a segment created a moment ago can be
  // missing from the next page's server-rendered data. Confirming it here,
  // with Playwright's normal retrying assertion, absorbs that before the
  // JTBD form's segment checkbox relies on it being present.
  await expect(page.getByRole('heading', { name: segmentName })).toBeVisible()

  const category = uniqueName('Matrix Category')
  await page.goto('/jtbd/new')
  await page
    .getByLabel('Формулировка JTBD')
    .fill('Когда я использую матрицу, я хочу видеть покрытие')
  await page.getByLabel('Категория').fill(category)
  await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), productName)
  await page.getByLabel(segmentName).check()
  await page.getByLabel('Подтверждено исследованием').check()
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/jtbd\/c[a-z0-9]{10,}$/)

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
  await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), productName)
  // "Подтверждено исследованием" left unchecked on purpose.
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/jtbd\/c[a-z0-9]{10,}$/)

  await page.goto('/reports/gaps')
  // Since C3 the row's title is plain text and the link is the action that
  // resolves the gap, so this asserts the text rather than a link by name.
  // The row now leads with the key phrase («Его увидеть»), and uniqueName()
  // put the unique suffix in the dropped «, чтобы …» tail — so anchor on the
  // untouched text the row carries in its title.
  await expect(byFullText(page, jtbdTitle)).toBeVisible()
})
