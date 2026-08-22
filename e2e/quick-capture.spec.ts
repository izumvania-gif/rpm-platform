import { expect, test } from '@playwright/test'
import { createProductViaUI, uniqueName } from './helpers'

// Global quick capture (plans/2.0-product-leap-plan.md, A3).

test('"c" opens quick capture, saves an insight, and stays open for the next one', async ({
  page,
}) => {
  const productName = uniqueName('Capture Product')
  await createProductViaUI(page, productName)

  await page.goto('/products')
  await page.locator('body').click({ position: { x: 5, y: 5 } })

  await page.keyboard.press('c')
  const dialog = page.getByRole('dialog', { name: 'Быстрый захват' })
  await expect(dialog).toBeVisible()

  // The product select defaults to the remembered/first product; pick ours
  // explicitly so the assertion below is not order-dependent.
  await dialog.getByRole('combobox', { name: 'Продукт', exact: true }).click()
  await page.getByRole('option', { name: productName }).click()

  const insightText = uniqueName('Клиент не готов ждать неделю')
  await dialog.getByRole('textbox').fill(insightText)
  await dialog.getByRole('button', { name: 'Сохранить' }).click()

  // Capture is bursty — the overlay stays open and clears, rather than
  // closing after each save.
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('textbox')).toHaveValue('')
  await expect(page.getByRole('status')).toContainText('сохранён')

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)

  await page.goto('/insights')
  await expect(page.getByText(insightText)).toBeVisible()
})

test('captured type switches between insight, hypothesis and segment', async ({ page }) => {
  const productName = uniqueName('Capture Types Product')
  await createProductViaUI(page, productName)

  await page.goto('/products')
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('c')

  const dialog = page.getByRole('dialog', { name: 'Быстрый захват' })
  await dialog.getByRole('combobox', { name: 'Продукт', exact: true }).click()
  await page.getByRole('option', { name: productName }).click()

  await dialog.getByRole('button', { name: 'Сегмент' }).click()
  const segmentName = uniqueName('Банки топ-30')
  await dialog.getByRole('textbox').fill(segmentName)
  await dialog.getByRole('button', { name: 'Сохранить' }).click()
  await expect(page.getByRole('status')).toHaveText('Сегмент сохранён')

  await page.keyboard.press('Escape')
  await page.goto('/segments')
  await expect(page.getByText(segmentName)).toBeVisible()
})

test('"g c" still navigates to Разговоры instead of opening capture', async ({ page }) => {
  // "c" is both the quick-capture key and the second key of the "g c" goto
  // sequence. Both shortcuts are handled in one place precisely so they
  // cannot both fire; this pins that down.
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.locator('body').click({ position: { x: 5, y: 5 } })

  await page.keyboard.press('g')
  await page.keyboard.press('c')
  await page.waitForURL('/conversations')
  await expect(page.getByRole('dialog', { name: 'Быстрый захват' })).toHaveCount(0)
})
