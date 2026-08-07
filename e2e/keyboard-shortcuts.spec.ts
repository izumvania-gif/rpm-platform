import { expect, test } from '@playwright/test'

test('g then a letter navigates to the matching section', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.locator('body').click({ position: { x: 5, y: 5 } })

  await page.keyboard.press('g')
  await page.keyboard.press('s')
  await page.waitForURL('/segments')

  await page.keyboard.press('g')
  await page.keyboard.press('j')
  await page.waitForURL('/jtbd')

  await page.keyboard.press('g')
  await page.keyboard.press('k')
  await page.waitForURL('/competitors')
})

test('n creates a new record in a section that supports it', async ({ page }) => {
  await page.goto('/segments', { waitUntil: 'networkidle' })
  await page.locator('body').click({ position: { x: 5, y: 5 } })

  await page.keyboard.press('n')
  await page.waitForURL('/segments/new')
})

test('shortcuts are ignored while typing in a text field', async ({ page }) => {
  await page.goto('/search', { waitUntil: 'networkidle' })
  const searchInput = page.getByPlaceholder('Поиск...')
  await searchInput.click()
  await searchInput.type('gjn')

  // 'g'/'j'/'n' typed into the search box must not trigger navigation.
  await expect(page).toHaveURL(/\/search$/)
  await expect(searchInput).toHaveValue('gjn')
})
