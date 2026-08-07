import { expect, test } from '@playwright/test'
import { createProductViaUI, uniqueName } from './helpers'

test('the header search box finds a record across modules', async ({ page }) => {
  const name = uniqueName('Searchable Product Xyz')
  await createProductViaUI(page, name)

  await page.goto('/')
  await page.getByPlaceholder('Поиск...').fill(name)
  await page.getByPlaceholder('Поиск...').press('Enter')
  await page.waitForURL(/\/search\?q=/)

  await expect(page.getByRole('heading', { name: `Поиск: «${name}»` })).toBeVisible()
  await expect(page.getByRole('link', { name })).toBeVisible()
})

test('an empty query shows a hint instead of running a search', async ({ page }) => {
  await page.goto('/search')
  await expect(page.getByText('Введите запрос в поле поиска в шапке.')).toBeVisible()
})

test('a query with no matches says so', async ({ page }) => {
  await page.goto(`/search?q=${encodeURIComponent(uniqueName('nonexistent-query'))}`)
  await expect(page.getByText('Ничего не найдено.')).toBeVisible()
})
