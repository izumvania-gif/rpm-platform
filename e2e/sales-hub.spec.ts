import { expect, test } from '@playwright/test'
import { createProductViaUI, selectOptionRobust, uniqueName } from './helpers'

test('shows sales-kit resources first, and a qualitative answer for "do we have feature X"', async ({
  page,
}) => {
  const productName = uniqueName('Sales Hub Product')
  const productUrl = await createProductViaUI(page, productName)
  const productId = productUrl.split('/').pop()!

  // A non-sales-kit resource created first, so DOM order would put it
  // before the sales kit unless the page explicitly re-sorts.
  await page.goto(`/resources/new?productId=${productId}`)
  await page.getByLabel('Название').fill(uniqueName('Confluence page'))
  await selectOptionRobust(page, page.getByLabel('Тип'), 'Confluence')
  await page.getByRole('button', { name: 'Добавить' }).click()
  await page.waitForURL(new RegExp(`/products/${productId}$`))

  const salesKitTitle = uniqueName('Sales deck')
  await page.goto(`/resources/new?productId=${productId}`)
  await page.getByLabel('Название').fill(salesKitTitle)
  await selectOptionRobust(page, page.getByLabel('Тип'), 'Sales-kit')
  await page.getByRole('button', { name: 'Добавить' }).click()
  await page.waitForURL(new RegExp(`/products/${productId}$`))

  const featureName = uniqueName('SSO login')
  await page.goto('/features/new')
  await page.getByLabel('Название').fill(featureName)
  await selectOptionRobust(page, page.getByLabel('Продукт'), productName)
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/features\/(?!new)[^/]+$/)

  const plannedTitle = uniqueName('SAML support')
  await page.goto(`/pm/roadmap/new?productId=${productId}`)
  await page.getByLabel('Название').fill(plannedTitle)
  await page.getByLabel('Квартал').fill('2026 Q4')
  await page.getByRole('button', { name: 'Добавить' }).click()
  await page.waitForURL(new RegExp(`/pm\\?productId=${productId}`))

  await page.goto(`/sales-hub?productId=${productId}`)
  await expect(page.getByRole('heading', { name: 'Продажи' })).toBeVisible()

  // Sales-kit sorts first regardless of creation order.
  const materialsCard = page
    .locator('div', { has: page.getByRole('heading', { name: 'Материалы' }) })
    .first()
  const firstResource = materialsCard.locator('li').first()
  await expect(firstResource).toContainText('Sales-kit')
  await expect(firstResource).toContainText(salesKitTitle)

  // Feature exists.
  await page.getByLabel('Название фичи').fill(featureName)
  await page.getByRole('button', { name: 'Найти' }).click()
  await expect(page.getByText('уже есть')).toBeVisible()

  // Roadmap-only match — qualitative status, no quarter leaking through.
  await page.getByLabel('Название фичи').fill(plannedTitle)
  await page.getByRole('button', { name: 'Найти' }).click()
  await expect(page.getByText('запланировано')).toBeVisible()
  await expect(page.getByText('2026 Q4')).toHaveCount(0)

  // Nothing matches.
  await page.getByLabel('Название фичи').fill(uniqueName('Totally unrelated query'))
  await page.getByRole('button', { name: 'Найти' }).click()
  await expect(page.getByText('Не найдено')).toBeVisible()
})
