import { expect, test } from '@playwright/test'
import { createProductViaUI, uniqueName } from './helpers'

// Cancel links on /pm/*/new forms (plans/2.0-ux-improvement-plan.md, Фаза 4)
// — previously the only way back was the browser's own "Назад" button. These
// full pages are still reachable as the "Больше полей →" escape hatch from
// the inline forms added in Фаза 5 (see the "Отмена collapses..." tests
// below for the inline forms' own, non-navigating Cancel).

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

// Фаза 5's inline forms don't navigate anywhere to create — "Отмена" there
// just collapses the form back to its toggle button, discarding the draft.

test('Отмена collapses the inline roadmap item form without navigating', async ({ page }) => {
  const productName = uniqueName('Inline Cancel Roadmap Product')
  const productUrl = await createProductViaUI(page, productName)
  const productId = productUrl.split('/').pop()!

  await page.goto(`/pm/roadmap?productId=${productId}`)
  await page.getByRole('button', { name: 'Добавить пункт' }).click()
  const draftTitle = uniqueName('Unsaved inline roadmap item')
  await page.getByPlaceholder('Название').fill(draftTitle)

  await page.getByRole('button', { name: 'Отмена' }).click()
  await expect(page).toHaveURL(new RegExp(`/pm/roadmap\\?productId=${productId}$`))
  await expect(page.getByRole('button', { name: 'Добавить пункт' })).toBeVisible()
  await expect(page.getByText(draftTitle)).toHaveCount(0)
})

test('Отмена collapses the inline action plan form without navigating', async ({ page }) => {
  const productName = uniqueName('Inline Cancel Action Plan Product')
  const productUrl = await createProductViaUI(page, productName)
  const productId = productUrl.split('/').pop()!

  await page.goto(`/pm/action-plans?productId=${productId}`)
  await page.getByRole('button', { name: 'Добавить план' }).click()
  const draftScenario = uniqueName('Unsaved inline scenario')
  await page
    .getByPlaceholder('Сценарий, напр. Клиент публично жалуется в соцсетях')
    .fill(draftScenario)

  await page.getByRole('button', { name: 'Отмена' }).click()
  await expect(page).toHaveURL(new RegExp(`/pm/action-plans\\?productId=${productId}$`))
  await expect(page.getByRole('button', { name: 'Добавить план' })).toBeVisible()
  await expect(page.getByText(draftScenario)).toHaveCount(0)
})

test('Отмена collapses the inline process form without navigating', async ({ page }) => {
  const productName = uniqueName('Inline Cancel Process Product')
  const productUrl = await createProductViaUI(page, productName)
  const productId = productUrl.split('/').pop()!

  await page.goto(`/pm/processes?productId=${productId}`)
  await page.getByRole('button', { name: 'Добавить процесс' }).click()
  const draftTitle = uniqueName('Unsaved inline process')
  await page.getByPlaceholder('Например: Запуск маркетинговой кампании').fill(draftTitle)

  await page.getByRole('button', { name: 'Отмена' }).click()
  await expect(page).toHaveURL(new RegExp(`/pm/processes\\?productId=${productId}$`))
  await expect(page.getByRole('button', { name: 'Добавить процесс' })).toBeVisible()
  await expect(page.getByText(draftTitle)).toHaveCount(0)
})
