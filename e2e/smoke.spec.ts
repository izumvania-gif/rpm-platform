import { expect, test } from '@playwright/test'

test('dashboard loads with the main navigation', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'RPM Platform' })).toBeVisible()
  const nav = page.locator('header nav')
  await expect(nav.getByRole('link', { name: 'Продукты' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Сегменты' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Исследования' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Маркетинг' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'JTBD' })).toBeVisible()
})

test('every top-level module page renders without a server error', async ({ page }) => {
  const routes = [
    '/products',
    '/segments',
    '/research',
    '/jtbd',
    '/jtbd/graph',
    '/hypotheses',
    '/conversations',
    '/competitors',
    '/features',
    '/marketing',
    '/insights',
    '/reports',
    '/reports/gaps',
    '/reports/segments-jtbd',
  ]

  for (const route of routes) {
    const response = await page.goto(route)
    expect(response?.ok(), `${route} responded with ${response?.status()}`).toBe(true)
  }
})
