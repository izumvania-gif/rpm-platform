import { expect, test } from '@playwright/test'
import { createProductViaUI, uniqueName } from './helpers'

// Creating a record from the page you are already on (A).
//
// The point of the «+» is not the modal itself — it is that the page you were
// reading does not go away. So the assertions here are about staying put and
// about not losing what was typed, not about the overlay's looks.

test('the «+» on a module card creates without leaving the page', async ({ page }) => {
  const productName = uniqueName('Quick Add Product')
  const productUrl = await createProductViaUI(page, productName)
  await page.goto(productUrl)

  const segmentName = uniqueName('Сегмент из модалки')
  await page.getByRole('button', { name: 'Добавить сегмент' }).click()

  const dialog = page.getByRole('dialog', { name: 'Быстрый захват' })
  await expect(dialog).toBeVisible()
  // Still on the product page: no navigation happened.
  await expect(page).toHaveURL(productUrl)
  // And the product is already the one whose page we are on.
  await expect(dialog.getByRole('combobox', { name: 'Продукт' })).toContainText(productName)

  await dialog.getByRole('textbox').first().fill(segmentName)
  await dialog.getByRole('button', { name: 'Сохранить' }).click()

  await expect(dialog.getByRole('status')).toContainText('Сегмент сохранён')
  await expect(page).toHaveURL(productUrl)

  await page.keyboard.press('Escape')
  await page.reload()
  await expect(page.getByRole('link', { name: segmentName })).toBeVisible()
})

test('a JTBD is refused until its category is given', async ({ page }) => {
  const productName = uniqueName('Quick JTBD Product')
  const productUrl = await createProductViaUI(page, productName)
  await page.goto(productUrl)

  await page.getByRole('button', { name: 'Добавить JTBD' }).click()
  const dialog = page.getByRole('dialog', { name: 'Быстрый захват' })
  const save = dialog.getByRole('button', { name: 'Сохранить' })

  await dialog.getByRole('textbox').first().fill(uniqueName('Когда я тороплюсь, я хочу успеть'))
  // Category is required by the model; saving with a placeholder would
  // pollute the coverage reports, so the modal refuses rather than invents.
  await expect(save).toBeDisabled()

  await dialog.getByLabel('Категория').fill('Скорость')
  await expect(save).toBeEnabled()
})

test('«Больше полей» carries what was already typed into the full form', async ({ page }) => {
  const productName = uniqueName('Handoff Product')
  const productUrl = await createProductViaUI(page, productName)
  await page.goto(productUrl)

  const text = uniqueName('Клиенты не готовы ждать неделю')
  await page.getByRole('button', { name: 'Добавить инсайт' }).click()
  const dialog = page.getByRole('dialog', { name: 'Быстрый захват' })
  await dialog.getByRole('textbox').first().fill(text)
  await dialog.getByRole('link', { name: /Больше полей/ }).click()

  await page.waitForURL(/\/insights\/new/)
  // The sentence survives the hand-off — losing it is the failure this link
  // exists to avoid.
  await expect(page.getByLabel('Цитата или вывод')).toHaveValue(text)
})
