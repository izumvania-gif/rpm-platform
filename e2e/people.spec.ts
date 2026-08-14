import { expect, test } from '@playwright/test'
import { confirmDelete, createProductViaUI, selectOptionRobust, uniqueName } from './helpers'

test('create a person, inline-edit their role, then delete them', async ({ page }) => {
  const name = uniqueName('Alice PM')
  await page.goto('/people/new')
  await page.getByLabel('Имя').fill(name)
  await page.getByLabel('Роль / должность').fill('Продакт-менеджер')
  await page.getByLabel('Навыки/компетенции (через запятую)').fill('discovery, roadmapping')
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/people\/[^/]+$/)

  await expect(page.getByRole('heading', { name })).toBeVisible()
  await expect(page.getByText('discovery')).toBeVisible()
  await expect(page.getByText('roadmapping')).toBeVisible()

  // Inline-edit the role field (components/shared/inline-editable-field.tsx).
  await page.getByRole('button', { name: 'Продакт-менеджер' }).click()
  const roleInput = page.locator('input[type="text"]').first()
  await roleInput.fill('Head of Product')
  await roleInput.press('Enter')
  await expect(page.getByRole('button', { name: 'Head of Product' })).toBeVisible()

  await confirmDelete(page)
  await page.waitForURL('/people')
  await expect(page.getByText(name)).toHaveCount(0)
})

test('assigning a person as a product owner shows up on the product page', async ({ page }) => {
  const productName = uniqueName('Owned Product')
  await createProductViaUI(page, productName)

  const ownerName = uniqueName('Bob PM')
  await page.goto('/people/new')
  await page.getByLabel('Имя').fill(ownerName)
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/people\/[^/]+$/)

  await page.goto('/products')
  await page.getByRole('link', { name: productName }).click()
  await page.waitForURL(/\/products\/[^/]+$/)
  await page.getByRole('link', { name: 'Редактировать' }).click()

  await selectOptionRobust(page, page.getByLabel('Ответственный PM'), ownerName)
  await page.getByRole('button', { name: 'Сохранить' }).click()
  await page.waitForURL(/\/products\/[^/]+$/)

  await expect(page.getByText(ownerName)).toBeVisible()

  await page.goto(`/people`)
  await page.getByRole('link', { name: ownerName }).click()
  await expect(page.getByText(productName)).toBeVisible()
})

test('the persona switcher links to the 2.0 stub views', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Представления' }).click()
  await page.getByRole('menuitem', { name: 'PM' }).click()
  await page.waitForURL('/pm')
  await expect(page.getByRole('heading', { name: 'PM' })).toBeVisible()
})
