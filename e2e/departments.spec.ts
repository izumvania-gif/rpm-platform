import { expect, test } from '@playwright/test'
import { confirmDelete, selectOptionRobust, uniqueName } from './helpers'

test('create a department, assign it to a product, then rename and delete it', async ({ page }) => {
  const departmentName = uniqueName('MFA-продукты')
  await page.goto('/departments/new')
  await page.getByLabel('Название').fill(departmentName)
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/departments\/(?!new)[^/]+$/)
  await expect(page.getByRole('heading', { name: departmentName })).toBeVisible()

  const productName = uniqueName('Department Product')
  await page.goto('/products/new')
  await page.getByLabel('Название').fill(productName)
  await selectOptionRobust(page, page.getByLabel('Департамент'), departmentName)
  await page.getByRole('button', { name: 'Создать', exact: true }).click()
  await page.waitForURL(/\/products\/(?!new)[^/]+$/)

  await page.goto('/departments')
  const row = page.locator('li', { hasText: departmentName })
  await expect(row).toContainText('1 продукт')

  await page.goto('/departments')
  await page.getByRole('link', { name: departmentName }).click()
  await page.waitForURL(/\/departments\/[^/]+$/)
  await expect(page.getByRole('link', { name: productName })).toBeVisible()

  // Inline-editable field (§2.9.5): click the name to turn it into an input.
  const renamed = `${departmentName} (обновлено)`
  await page.getByRole('button', { name: departmentName }).click()
  const nameInput = page.locator('input[type="text"]').first()
  await nameInput.fill(renamed)
  await nameInput.press('Enter')
  await expect(page.getByRole('heading', { name: renamed })).toBeVisible()

  await confirmDelete(page)
  await page.waitForURL(/\/departments$/)
  await expect(page.getByText(renamed)).toHaveCount(0)
})

test('bulk-assign several existing products to a department in one submission', async ({
  page,
}) => {
  const productAName = uniqueName('Bulk Assign A')
  const productBName = uniqueName('Bulk Assign B')
  for (const name of [productAName, productBName]) {
    await page.goto('/products/new')
    await page.getByLabel('Название').fill(name)
    await page.getByRole('button', { name: 'Создать', exact: true }).click()
    await page.waitForURL(/\/products\/(?!new)[^/]+$/)
  }

  const departmentName = uniqueName('Bulk Assign Dept')
  await page.goto('/departments/new')
  await page.getByLabel('Название').fill(departmentName)
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/departments\/(?!new)[^/]+$/)

  await page.getByLabel(productAName).check()
  await page.getByLabel(productBName).check()
  await page.getByRole('button', { name: 'Добавить выбранные' }).click()
  await page.waitForURL(/\/departments\/[^/]+$/)

  await expect(page.getByText(`Продукты (2)`)).toBeVisible()
  await expect(page.getByRole('link', { name: productAName })).toBeVisible()
  await expect(page.getByRole('link', { name: productBName })).toBeVisible()
})

test('CPO groups products by department and shows a multi-product Gantt', async ({ page }) => {
  const departmentName = uniqueName('Электронная подпись')
  await page.goto('/departments/new')
  await page.getByLabel('Название').fill(departmentName)
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/departments\/(?!new)[^/]+$/)

  const productName = uniqueName('Gantt Dept Product')
  await page.goto('/products/new')
  await page.getByLabel('Название').fill(productName)
  await selectOptionRobust(page, page.getByLabel('Департамент'), departmentName)
  await page.getByRole('button', { name: 'Создать', exact: true }).click()
  await page.waitForURL(/\/products\/(?!new)[^/]+$/)
  const productId = page.url().split('/').pop()!

  const itemTitle = uniqueName('Интеграция с ЕПГУ')
  await page.goto(`/pm/roadmap/new?productId=${productId}`)
  await page.getByLabel('Название').fill(itemTitle)
  await page.locator('#startDate').fill('2026-09-01')
  await page.locator('#endDate').fill('2026-09-20')
  await page.getByRole('button', { name: 'Добавить' }).click()
  await page.waitForURL(new RegExp(`/pm/roadmap\\?productId=${productId}`))

  await page.goto('/cpo')
  await expect(page.getByText(departmentName).first()).toBeVisible()

  await page.getByRole('link', { name: 'Гант' }).click()
  await page.waitForURL(/\/cpo\?view=gantt/)
  await expect(page.getByText(departmentName).first()).toBeVisible()
  await expect(page.getByText(productName).first()).toBeVisible()
})
