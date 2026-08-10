import { expect, test } from '@playwright/test'
import { createProductViaUI, uniqueName } from './helpers'

// Cancel links on /pm/*/new forms (plans/2.0-ux-improvement-plan.md, Фаза 4)
// — previously the only way back was the browser's own "Назад" button.

test('Отмена on the roadmap item form returns to /pm without saving', async ({ page }) => {
  const productName = uniqueName('Cancel Roadmap Product')
  const productUrl = await createProductViaUI(page, productName)
  const productId = productUrl.split('/').pop()!

  await page.goto(`/pm/roadmap/new?productId=${productId}`)
  const draftTitle = uniqueName('Unsaved roadmap item')
  await page.getByLabel('Название').fill(draftTitle)
  await page.getByRole('link', { name: 'Отмена' }).click()
  await page.waitForURL(new RegExp(`/pm\\?productId=${productId}&scrollTo=roadmap$`))
  await expect(page.getByText(draftTitle)).toHaveCount(0)
})

test('Отмена on the action plan form returns to /pm without saving', async ({ page }) => {
  const productName = uniqueName('Cancel Action Plan Product')
  const productUrl = await createProductViaUI(page, productName)
  const productId = productUrl.split('/').pop()!

  await page.goto(`/pm/action-plans/new?productId=${productId}`)
  const draftScenario = uniqueName('Unsaved scenario')
  await page.getByLabel('Сценарий', { exact: true }).fill(draftScenario)
  await page.getByRole('link', { name: 'Отмена' }).click()
  await page.waitForURL(new RegExp(`/pm\\?productId=${productId}&scrollTo=action-plans$`))
  await expect(page.getByText(draftScenario)).toHaveCount(0)
})

test('Отмена on the process form returns to /pm without saving', async ({ page }) => {
  const productName = uniqueName('Cancel Process Product')
  const productUrl = await createProductViaUI(page, productName)
  const productId = productUrl.split('/').pop()!

  await page.goto(`/pm/processes/new?productId=${productId}`)
  const draftTitle = uniqueName('Unsaved process')
  await page.getByLabel('Название процесса').fill(draftTitle)
  await page.getByRole('link', { name: 'Отмена' }).click()
  await page.waitForURL(new RegExp(`/pm\\?productId=${productId}&scrollTo=process$`))
  await expect(page.getByText(draftTitle)).toHaveCount(0)
})
