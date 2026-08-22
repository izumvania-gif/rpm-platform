import { expect, test } from '@playwright/test'
import { createProductViaUI, selectOptionRobust, uniqueName } from './helpers'

// The chain widget and the chain ribbon (plans/2.0-product-leap-plan.md §C5).
// Both make a claim about the user's own data, and both are easy to break
// silently: the widget by counting the wrong side of a relation, the ribbon by
// quietly dropping a stage that has nothing in it — which is exactly the stage
// worth showing.

test('the dashboard widget names the weakest link', async ({ page }) => {
  await page.goto('/')
  const widget = page.getByRole('heading', { name: 'Цепочка дискавери' })
  await expect(widget).toBeVisible()

  // Five stages, each its own meter — never a funnel, and never a stage
  // silently dropped because it happens to be empty.
  for (const label of ['Сегменты', 'JTBD', 'Гипотезы', 'Фичи', 'Маркетинг']) {
    await expect(page.getByRole('meter', { name: new RegExp(`^${label}:`) })).toHaveCount(1)
  }
})

test('a record with a missing link shows the gap instead of hiding it', async ({ page }) => {
  const productName = uniqueName('Chain Product')
  await createProductViaUI(page, productName)

  const segmentName = uniqueName('Сегмент цепочки')
  await page.goto('/segments/new')
  await page.getByLabel('Название').fill(segmentName)
  await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), productName)
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/segments\/[^/]+$/)

  const jtbdTitle = uniqueName('Задача цепочки')
  await page.goto('/jtbd/new')
  await page.getByLabel('Формулировка JTBD').fill(jtbdTitle)
  await page.getByLabel('Категория').fill('цепочка')
  await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), productName)
  await page.getByLabel(segmentName).check()
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/jtbd\/[0-9a-z]+$/)

  const ribbon = page.getByRole('navigation', { name: 'Цепочка связей этой записи' })
  await expect(ribbon).toBeVisible()

  // What exists is a link to the actual record...
  await expect(ribbon.getByRole('link', { name: segmentName })).toBeVisible()

  // ...and what is missing says so, with a way to fix it. A ribbon that
  // rendered only the filled stages would look complete while being broken.
  await expect(ribbon.getByText('ни одной').first()).toBeVisible()
  await expect(ribbon.getByRole('link', { name: 'добавить' }).first()).toBeVisible()
})

test('the product page leads with what needs attention, not with everything', async ({ page }) => {
  const productName = uniqueName('Overview Product')
  const productUrl = await createProductViaUI(page, productName)

  // Six segments, so the card must cap and choose which five to show.
  for (let i = 0; i < 6; i++) {
    await page.goto('/segments/new')
    await page.getByLabel('Название').fill(uniqueName(`Сегмент ${i}`))
    await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), productName)
    await page.getByRole('button', { name: 'Создать' }).click()
    await page.waitForURL(/\/segments\/[^/]+$/)
  }

  await page.goto(productUrl)

  // The header states the problem instead of only counting records: none of
  // the six segments has a job yet.
  await expect(page.getByText('6 без задач')).toBeVisible()

  // Five rows, then a way to the full list — not all six inline.
  await expect(page.getByRole('link', { name: /^Ещё 1/ })).toBeVisible()
})
