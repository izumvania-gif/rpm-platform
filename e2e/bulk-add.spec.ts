import { expect, test } from '@playwright/test'
import { byFullText, createProductViaUI, uniqueName } from './helpers'

// Bulk paste-many entry (plans/2.0-product-leap-plan.md, A1).

test('pastes a messy list and creates one record per meaningful line', async ({ page }) => {
  const productName = uniqueName('Bulk Product')
  const productUrl = await createProductViaUI(page, productName)

  await page.goto(productUrl)
  await page.getByRole('button', { name: 'Добавить списком' }).click()

  const stamp = Date.now()
  const a = `Банки топ-30 ${stamp}`
  const b = `Госзаказчики ${stamp}`
  const c = `СМБ-интеграторы ${stamp}`

  // Bullets, a blank line and a repeated entry — exactly what a paste out of
  // a document looks like.
  await page.getByRole('textbox').first().fill(`- ${a}\n* ${b}\n\n1. ${c}\n${a}\n`)

  // The button states the count that will actually be created (3, not 5).
  await expect(page.getByRole('button', { name: 'Добавить (3)' })).toBeVisible()
  await page.getByRole('button', { name: 'Добавить (3)' }).click()
  await expect(page.getByRole('status')).toHaveText('Добавлено записей: 3')

  await page.goto('/segments')
  await expect(page.getByText(a)).toHaveCount(1)
  await expect(page.getByText(b)).toBeVisible()
  await expect(page.getByText(c)).toBeVisible()
})

test('switching the entity type adds to a different module', async ({ page }) => {
  const productName = uniqueName('Bulk Types Product')
  const productUrl = await createProductViaUI(page, productName)

  await page.goto(productUrl)
  await page.getByRole('button', { name: 'Добавить списком' }).click()

  await page.getByRole('combobox', { name: 'Что добавляем' }).click()
  await page.getByRole('option', { name: 'Гипотезы' }).click()

  const statement = uniqueName('Если убрать визит в офис, онбординг ускорится')
  await page.getByRole('textbox').first().fill(statement)
  await page.getByRole('button', { name: 'Добавить (1)' }).click()
  await expect(page.getByRole('status')).toHaveText('Добавлено записей: 1')

  await page.goto('/hypotheses')
  await expect(byFullText(page, statement)).toBeVisible()
})
