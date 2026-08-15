import { expect, test } from '@playwright/test'
import { createProductViaUI, uniqueName } from './helpers'

// The «+» on a module list page.
//
// «Новый JTBD» costs three route changes per record — form, then the new
// record's own detail page (not the list you came from), then walking back.
// The modal was already built and already knows how to create seven of the
// eleven types; the list pages simply had no button for it.

test('the «+» on a list page creates without leaving the list', async ({ page }) => {
  const productName = uniqueName('List Quick Add Product')
  await createProductViaUI(page, productName)

  await page.goto('/segments')
  const name = uniqueName('Сегмент со списка')
  await page.getByRole('button', { name: /Быстро добавить сегмент/ }).click()

  const dialog = page.getByRole('dialog', { name: 'Быстрый захват' })
  await expect(dialog).toBeVisible()
  // No product in the URL here, so the modal picks one itself and shows which.
  await expect(dialog.getByRole('combobox', { name: 'Продукт' })).not.toBeEmpty()

  await dialog.getByRole('textbox').first().fill(name)
  await dialog.getByRole('button', { name: 'Сохранить' }).click()
  await expect(dialog.getByRole('status')).toContainText('Сегмент сохранён')

  // Still the list — that is the whole point.
  await expect(page).toHaveURL(/\/segments$/)
  await page.keyboard.press('Escape')
  await page.reload()
  await expect(page.getByRole('link', { name })).toBeVisible()
})

test('the full form is still one click away, unchanged', async ({ page }) => {
  // The «+» is added beside «Новый …», never instead of it: the modal asks
  // only for what a record requires, and the rest of the fields live here.
  await page.goto('/jtbd')
  await page.getByRole('link', { name: 'Новый JTBD' }).click()
  await page.waitForURL(/\/jtbd\/new/)
  await expect(page.getByLabel('Формулировка JTBD')).toBeVisible()
})
