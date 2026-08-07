import { expect, test } from '@playwright/test'
import { createProductViaUI, selectOptionRobust, uniqueName } from './helpers'

test('a conversation links to an insight created from it', async ({ page }) => {
  const productName = uniqueName('Conv Product')
  await createProductViaUI(page, productName)

  const convTitle = uniqueName('Call with a churned customer')
  await page.goto('/conversations/new')
  await page.getByLabel('Название').fill(convTitle)
  await selectOptionRobust(page, page.getByLabel('Продукт'), productName)
  await page.getByLabel('Транскрипт / заметки').fill('Customer: it was too slow to set up.')
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/conversations\/[^/]+$/)
  await expect(page.getByRole('heading', { name: convTitle })).toBeVisible()

  const insightText = uniqueName('"It was too slow to set up"')
  await page.goto('/insights/new')
  await page.getByLabel('Цитата или вывод').fill(insightText)
  await selectOptionRobust(page, page.getByLabel('Продукт'), productName)
  await page.getByLabel('Разговор').selectOption({ label: convTitle })
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/insights\/[^/]+$/)
  await expect(page.getByText(insightText)).toBeVisible()

  await page.goto('/insights')
  await expect(page.getByText(insightText)).toBeVisible()
})
