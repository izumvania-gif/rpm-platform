import { expect, test } from '@playwright/test'
import { confirmDelete, createProductViaUI, selectRadixOption, uniqueName } from './helpers'

test('the product block on /pm inline-edits name, stage, and description', async ({ page }) => {
  const productName = uniqueName('Team Hub Product')
  const productUrl = await createProductViaUI(page, productName)
  const productId = productUrl.split('/').pop()!

  await page.goto(`/pm/team?productId=${productId}`)

  const renamed = `${productName} (renamed)`
  await page.getByRole('button', { name: productName, exact: true }).click()
  const nameInput = page.locator('input:focus')
  await nameInput.fill(renamed)
  await nameInput.press('Enter')
  await expect(page.getByRole('button', { name: renamed, exact: true })).toBeVisible()

  await page.getByRole('link', { name: 'Открыть карточку продукта →' }).click()
  await expect(page.getByRole('heading', { name: renamed })).toBeVisible()
})

test('add an existing person to the team roster, then remove them', async ({ page }) => {
  const productName = uniqueName('Roster Product')
  const productUrl = await createProductViaUI(page, productName)
  const productId = productUrl.split('/').pop()!

  const personName = uniqueName('Frank Analyst')
  await page.goto('/people/new')
  await page.getByLabel('Имя').fill(personName)
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/people\/(?!new)[^/]+$/)

  await page.goto(`/pm/team?productId=${productId}`)
  await expect(page.getByText('Команда продукта — явно добавленные люди')).toBeVisible()

  await page.getByRole('button', { name: '+ Добавить в команду' }).click()
  await selectRadixOption(page, page.getByLabel('Человек'), personName)
  await page.getByRole('button', { name: 'Добавить', exact: true }).click()

  await expect(page.getByText(personName)).toBeVisible()
  await expect(page.getByText('0 активных · 0 всего')).toBeVisible()

  await confirmDelete(page, page.getByRole('button', { name: 'Убрать' }))
  await page.waitForURL(/\/pm\/team\?productId=/)
  await expect(page.getByText('Команда продукта — явно добавленные люди')).toBeVisible()
})

test('create a new person directly from the team roster form', async ({ page }) => {
  const productName = uniqueName('Roster Inline Product')
  const productUrl = await createProductViaUI(page, productName)
  const productId = productUrl.split('/').pop()!

  await page.goto(`/pm/team?productId=${productId}`)
  await page.getByRole('button', { name: '+ Добавить в команду' }).click()
  await page.getByRole('button', { name: 'Новый человек' }).click()

  const personName = uniqueName('Grace Newcomer')
  await page.getByPlaceholder('Имя').fill(personName)
  await page.getByPlaceholder('Роль (необязательно)').fill('Продуктовый аналитик')
  await page.getByRole('button', { name: 'Добавить', exact: true }).click()

  await expect(page.getByText(personName)).toBeVisible()
  await expect(page.getByText('Продуктовый аналитик')).toBeVisible()
})
