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
  // This one test navigates 14 times in sequence, so it needs a bigger budget
  // than the 30s default that suits single-page specs: at ~2-3s per `goto` on
  // a loaded container it runs out of time partway through, and the route it
  // dies on moves between runs (/hypotheses one attempt, /insights the next) —
  // the signature of an exhausted budget rather than a broken page. Tripling
  // it via test.slow() keeps the assertion itself untouched.
  test.slow()

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
