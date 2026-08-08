import { expect, test } from '@playwright/test'
import { createProductViaUI, uniqueName } from './helpers'

test('switching to the Гант tab renders tracked bars grouped by block and a milestone line', async ({
  page,
}) => {
  const productName = uniqueName('Gantt Product')
  const productUrl = await createProductViaUI(page, productName)
  const productId = productUrl.split('/').pop()!

  const trackGroup = uniqueName('Разработка')
  const barTitle = uniqueName('Frontend redesign')
  await page.goto(`/pm/roadmap/new?productId=${productId}`)
  await page.getByLabel('Название').fill(barTitle)
  await page.getByLabel('Блок (группа дорожек)').fill(trackGroup)
  await page.getByLabel('Дорожка', { exact: true }).fill('Фронт')
  await page.locator('#startDate').fill('2026-09-01')
  await page.locator('#endDate').fill('2026-09-20')
  await page.getByRole('button', { name: 'Добавить' }).click()
  await page.waitForURL(new RegExp(`/pm\\?productId=${productId}`))

  const milestoneTitle = uniqueName('v3.0')
  await page.goto(`/pm/roadmap/new?productId=${productId}`)
  await page.getByLabel('Название').fill(milestoneTitle)
  await page.locator('#startDate').fill('2026-09-10')
  await page.getByLabel('Это веха', { exact: false }).check()
  await page.getByRole('button', { name: 'Добавить' }).click()
  await page.waitForURL(new RegExp(`/pm\\?productId=${productId}`))

  // List view is the default landing state for /pm.
  await expect(page.getByRole('link', { name: 'Список' })).toBeVisible()

  await page.getByRole('link', { name: 'Гант' }).click()
  await page.waitForURL(new RegExp(`/pm\\?productId=${productId}&view=gantt`))

  await expect(page.getByText(trackGroup)).toBeVisible()
  await expect(page.getByText('Фронт', { exact: true })).toBeVisible()
  await expect(page.getByText(barTitle)).toBeVisible()
  await expect(page.getByText(milestoneTitle)).toBeVisible()
})
