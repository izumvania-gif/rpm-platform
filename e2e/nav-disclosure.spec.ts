import { expect, test } from '@playwright/test'

// Progressive disclosure of the nav (plans/2.0-product-leap-plan.md, C1).
//
// The shared test database is populated, so the derived stage here is always
// 'full' — a collapsed nav cannot be produced by fixtures. These specs drive
// the explicit override instead, which is the same rendering path; the
// derivation itself (and its safety property, that basic mode only ever hides
// empty modules) is covered in tests/integration/nav-stage.test.ts.

async function collapseNav(page: import('@playwright/test').Page) {
  await page.addInitScript(() => window.localStorage.setItem('rpm:nav-stage', 'basic'))
}

test('a collapsed nav shows only the base chain', async ({ page }) => {
  await collapseNav(page)
  await page.goto('/')

  const nav = page.locator('header nav')
  await expect(nav.getByRole('link', { name: 'Продукты' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Сегменты' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'JTBD', exact: true })).toBeVisible()

  await expect(nav.getByRole('link', { name: 'Исследования' })).toHaveCount(0)
  await expect(nav.getByRole('link', { name: 'Маркетинг' })).toHaveCount(0)
})

test('hiding a link does not hide the route behind it', async ({ page }) => {
  await collapseNav(page)
  await page.goto('/')
  await expect(page.locator('header nav').getByRole('link', { name: 'Маркетинг' })).toHaveCount(0)

  // Reachable by URL while collapsed — this is disclosure, not access control.
  const response = await page.goto('/marketing')
  expect(response?.ok()).toBe(true)

  // And standing on a hidden section puts its tab back, so the nav never hides
  // the page you are currently looking at.
  await expect(page.locator('header nav').getByRole('link', { name: 'Маркетинг' })).toBeVisible()
})

test('the keyboard shortcut still reaches a hidden section', async ({ page }) => {
  await collapseNav(page)
  await page.goto('/')
  // `g` then `m` is the Маркетинг shortcut; hiding the tab must not unbind it.
  await page.keyboard.press('g')
  await page.keyboard.press('m')
  await page.waitForURL('/marketing')
})

test('the rail toggle expands the nav without a reload', async ({ page }) => {
  await collapseNav(page)
  await page.goto('/')

  const rail = page.locator('nav[aria-label="Разделы"]')
  await expect(rail.getByRole('link', { name: /Маркетинг/ })).toHaveCount(0)

  await rail.getByRole('button', { name: 'Все разделы' }).click()

  // One click moves both surfaces: the rail gains its module chips and the
  // header nav gains its tabs, through the shared nav-stage event.
  await expect(rail.getByRole('link', { name: /Маркетинг/ })).toBeVisible()
  await expect(page.locator('header nav').getByRole('link', { name: 'Исследования' })).toBeVisible()

  // And back again.
  await rail.getByRole('button', { name: 'Только основное' }).click()
  await expect(page.locator('header nav').getByRole('link', { name: 'Исследования' })).toHaveCount(
    0
  )
})
