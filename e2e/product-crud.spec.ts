import { expect, test } from '@playwright/test'
import { confirmDelete, createProductViaUI, selectRadixOption, uniqueName } from './helpers'

test('create, inline-edit, and delete a product', async ({ page }) => {
  const name = uniqueName('E2E Product')
  await createProductViaUI(page, name)

  await expect(page.getByRole('heading', { name })).toBeVisible()

  // Inline-editable field (§2.9.5): click the name to turn it into an input.
  await page.getByRole('button', { name }).click()
  const renamed = `${name} (renamed)`
  const nameInput = page.locator('input[type="text"]').first()
  await nameInput.fill(renamed)
  await nameInput.press('Enter')
  await expect(page.getByRole('heading', { name: renamed })).toBeVisible()

  // Print button is present and doesn't throw when invoked.
  await page.getByRole('button', { name: 'Печать' }).click()

  await confirmDelete(page)
  await page.waitForURL('/products')
  await expect(page.getByText(renamed)).toHaveCount(0)
})

test('create a product via the full edit form and change its stage', async ({ page }) => {
  const name = uniqueName('Full Form Product')
  await page.goto('/products/new')
  await page.getByLabel('Название').fill(name)
  await page.getByLabel('Slug (eng)').fill(`e2e-${Date.now()}`)
  await selectRadixOption(page, page.getByLabel('Стадия'), 'Рост')
  await page.getByRole('button', { name: 'Создать', exact: true }).click()
  await page.waitForURL(/\/products\/[^/]+$/)

  // Not getByText: Radix Select renders a visually-hidden (but not
  // aria-hidden-excluded-from-DOM-text-search) native <select> mirror for
  // native form/autofill fallback (components/ui/select.tsx), so a plain
  // text search also matches that hidden option. getByRole respects
  // aria-hidden and only resolves the one real, visible control.
  await expect(page.getByRole('button', { name: 'Рост' })).toBeVisible()
})
