import { expect, test } from '@playwright/test'
import { createProductViaUI, selectOptionRobust, uniqueName } from './helpers'

test('a feature links to a JTBD, and an RTB links to that feature', async ({ page }) => {
  const productName = uniqueName('Feature Product')
  await createProductViaUI(page, productName)

  const jtbdTitle = uniqueName('Когда я настраиваю интеграцию')
  await page.goto('/jtbd/new')
  await page.getByLabel('Формулировка JTBD').fill(jtbdTitle)
  await page.getByLabel('Категория').fill('Интеграции')
  await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), productName)
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/jtbd\/[^/]+$/)

  const featureName = uniqueName('One-click integration setup')
  await page.goto('/features/new')
  await page.getByLabel('Название').fill(featureName)
  await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), productName)
  await page.getByLabel(jtbdTitle).check()
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/features\/[^/]+$/)
  await expect(page.getByRole('heading', { name: featureName })).toBeVisible()
  // Scoped to the JTBD card: the chain ribbon at the top of the page names the
  // same job, so an unscoped getByText now matches twice.
  await expect(page.getByRole('link', { name: jtbdTitle }).last()).toBeVisible()

  const rtbStatement = uniqueName('Integrates in under 5 minutes')
  await page.goto('/marketing/new')
  await page.getByLabel('Формулировка обещания').fill(rtbStatement)
  await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), productName)
  await page.getByLabel(featureName).check()
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/marketing\/[^/]+$/)
  await expect(page.getByText(rtbStatement)).toBeVisible()
  await expect(page.getByText(featureName)).toBeVisible()
})
