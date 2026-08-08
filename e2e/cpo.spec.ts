import { expect, test } from '@playwright/test'
import { createProductViaUI, selectOptionRobust, uniqueName } from './helpers'

test('shows cross-product ecosystem correlations and the multi-product roadmap', async ({
  page,
}) => {
  const productAName = uniqueName('CPO Product A')
  const productBName = uniqueName('CPO Product B')
  await createProductViaUI(page, productAName)
  await createProductViaUI(page, productBName)

  const segmentName = uniqueName('Enterprise')
  for (const productName of [productAName, productBName]) {
    await page.goto('/segments/new')
    await page.getByLabel('Название').fill(segmentName)
    await selectOptionRobust(page, page.getByLabel('Продукт'), productName)
    await page.getByRole('button', { name: 'Создать' }).click()
    await page.waitForURL(/\/segments\/(?!new)[^/]+$/)
  }

  const category = uniqueName('Onboarding')
  for (const productName of [productAName, productBName]) {
    await page.goto('/jtbd/new')
    await page.getByLabel('Формулировка JTBD').fill(uniqueName('Job'))
    await page.getByLabel('Категория').fill(category)
    await selectOptionRobust(page, page.getByLabel('Продукт'), productName)
    await page.getByRole('button', { name: 'Создать' }).click()
    await page.waitForURL(/\/jtbd\/(?!new)[^/]+$/)
  }

  const roadmapItemTitle = uniqueName('Cross-product feature')
  await page.goto('/products')
  await page.getByRole('link', { name: productAName }).click()
  await page.waitForURL(/\/products\/[^/]+$/)
  const productAId = page.url().split('/').pop()!
  await page.goto(`/pm/roadmap/new?productId=${productAId}`)
  await page.getByLabel('Название').fill(roadmapItemTitle)
  await page.getByLabel('Квартал').fill('2026 Q4')
  await page.getByRole('button', { name: 'Добавить' }).click()
  await page.waitForURL(new RegExp(`/pm\\?productId=${productAId}`))

  await page.goto('/cpo')
  await expect(page.getByRole('heading', { name: 'CPO' })).toBeVisible()
  await expect(page.getByText(productAName).first()).toBeVisible()
  await expect(page.getByText(productBName).first()).toBeVisible()

  const segmentGroup = page.locator('li', { hasText: segmentName })
  await expect(segmentGroup).toContainText(productAName)
  await expect(segmentGroup).toContainText(productBName)

  const categoryGroup = page.locator('li', { hasText: category })
  await expect(categoryGroup).toContainText(productAName)
  await expect(categoryGroup).toContainText(productBName)

  await expect(page.getByText(roadmapItemTitle)).toBeVisible()
  await expect(page.getByText('2026 Q4').last()).toBeVisible()
})
