import { expect, test } from '@playwright/test'
import { createProductViaUI, selectOptionRobust, uniqueName } from './helpers'

// Derive, don't demand (plans/2.0-product-leap-plan.md, C4).

test('a transcript offers its quotes as insights, and accepting one saves it', async ({ page }) => {
  const productName = uniqueName('Suggest Product')
  await createProductViaUI(page, productName)

  const quote = uniqueName('Мы не можем ждать неделю выпуска сертификата')
  await page.goto('/conversations/new')
  await page.getByLabel('Название').fill(uniqueName('Разговор с подсказками'))
  await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), productName)
  await page.getByLabel('Транскрипт').fill(`Обсудили сроки. «${quote}» — сказал клиент.`)
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/conversations\/c[a-z0-9]{10,}$/)

  // The quote is offered without anything being written yet.
  await expect(page.getByText('Похоже на инсайты')).toBeVisible()
  const row = page.locator('li').filter({ hasText: quote })
  await expect(row).toBeVisible()
  await expect(page.getByText('прямая речь в кавычках')).toBeVisible()

  await row.getByRole('button', { name: 'В инсайты' }).click()

  // Accepted suggestions stop being offered, and the insight is real.
  await expect(page.getByText('прямая речь в кавычках')).toHaveCount(0)
  await page.goto('/insights')
  await expect(page.getByText(quote)).toBeVisible()
})

test('a conversation with no transcript offers nothing', async ({ page }) => {
  const productName = uniqueName('No Transcript Product')
  await createProductViaUI(page, productName)

  await page.goto('/conversations/new')
  await page.getByLabel('Название').fill(uniqueName('Разговор без транскрипта'))
  await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), productName)
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/conversations\/c[a-z0-9]{10,}$/)

  // Nothing to derive from, so the panel stays away entirely rather than
  // showing an empty box.
  await expect(page.getByText('Похоже на инсайты')).toHaveCount(0)
})

test('a feature with no marketing claim says so and offers the prefilled form', async ({
  page,
}) => {
  const productName = uniqueName('RTB Gap Product')
  await createProductViaUI(page, productName)

  const featureName = uniqueName('Массовый отзыв доступов')
  await page.goto('/features/new')
  await page.getByLabel('Название').fill(featureName)
  await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), productName)
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/features\/c[a-z0-9]{10,}$/)

  await expect(
    page.getByText('На эту фичу не опирается ни одно маркетинговое обещание — её нечем продавать.')
  ).toBeVisible()

  await page.getByRole('link', { name: 'Сформулировать обещание' }).click()
  await page.waitForURL(/\/marketing\/new\?/)

  // The feature arrives already ticked, so the link that was missing does not
  // have to be re-entered by hand.
  await expect(page.getByLabel(featureName)).toBeChecked()
})
