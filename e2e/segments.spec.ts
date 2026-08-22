import { expect, test } from '@playwright/test'
import { confirmDelete, createProductViaUI, selectOptionRobust, uniqueName } from './helpers'

test('create a segment with tags and audience share, then edit it inline', async ({ page }) => {
  const productName = uniqueName('Segments Product')
  await createProductViaUI(page, productName)

  const segmentName = uniqueName('Enterprise')
  await page.goto('/segments/new')
  await page.getByLabel('Название').fill(segmentName)
  await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), productName)
  await page.getByLabel('Доля аудитории (%)').fill('35')
  await page.getByLabel('Теги (через запятую)').fill('b2b, key-account')
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/segments\/[^/]+$/)

  await expect(page.getByRole('heading', { name: segmentName })).toBeVisible()
  await expect(page.getByText('b2b')).toBeVisible()
  await expect(page.getByText('key-account')).toBeVisible()

  // Inline-edit the audience share field.
  await page.getByRole('button', { name: '35% аудитории' }).click()
  const numberInput = page.locator('input[type="number"]').first()
  await numberInput.fill('60')
  await numberInput.press('Enter')
  await expect(page.getByRole('button', { name: '60% аудитории' })).toBeVisible()
})

test('deleting a segment cascades from the product page', async ({ page }) => {
  const productName = uniqueName('Cascade Product')
  const productUrl = await createProductViaUI(page, productName)

  const segmentName = uniqueName('To Delete')
  await page.goto('/segments/new')
  await page.getByLabel('Название').fill(segmentName)
  await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), productName)
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/segments\/[^/]+$/)

  await confirmDelete(page)
  await page.waitForURL('/segments')

  await page.goto(productUrl)
  await expect(page.getByText(segmentName)).toHaveCount(0)
})
