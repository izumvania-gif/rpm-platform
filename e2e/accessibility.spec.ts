import { expect, test } from '@playwright/test'
import { byFullText, createProductViaUI, selectOptionRobust, uniqueName } from './helpers'

// Accessibility fixes (plans/2.0-hardening-plan.md, Фаза 3 — B1/B2/B3).
// These pin behaviour that is invisible on screen and therefore silently
// regresses: a heading level, a tab stop, a focusable child.

const PAGES = [
  '/hypotheses',
  '/products',
  '/segments',
  '/features',
  '/jtbd',
  '/jtbd/graph',
  '/research',
  '/marketing',
  '/insights',
  '/people',
  '/conversations',
  '/competitors',
  '/departments',
  '/inbox',
  '/reports/gaps',
]

test('every list page has exactly one h1 and starts its outline there', async ({ page }) => {
  for (const path of PAGES) {
    await page.goto(path)
    // Exactly one: zero leaves a screen reader with no page title, more than
    // one makes the outline ambiguous.
    await expect(page.locator('h1'), `${path} should have one h1`).toHaveCount(1)
    const firstHeadingTag = await page.evaluate(
      () => document.querySelector('h1,h2,h3')?.tagName ?? 'NONE'
    )
    expect(firstHeadingTag, `${path} outline should start at h1`).toBe('H1')
  }
})

test('the skip-link is the first tab stop and moves focus to the content', async ({ page }) => {
  await page.goto('/pm')

  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Перейти к содержимому' })
  await expect(skip).toBeFocused()

  await page.keyboard.press('Enter')
  // Focus, not just scroll: without tabIndex on the target several browsers
  // scroll to the anchor but leave focus in the nav, so the next Tab resumes
  // from the header and the link achieves nothing.
  await expect(page.locator('#main')).toBeFocused()
})

test('a kanban card can be opened and edited without a mouse', async ({ page }) => {
  // A hypothesis needs a product, and without one the form just re-renders
  // with an error — so create the product first and wait for a real detail URL
  // rather than a pattern the form page itself also satisfies.
  const productName = uniqueName('A11y Kanban Product')
  await createProductViaUI(page, productName)

  const statement = uniqueName('Если убрать визит, то будет быстрее')
  await page.goto('/hypotheses/new')
  await page.getByLabel('Формулировка').fill(statement)
  await selectOptionRobust(page, page.getByLabel('Продукт'), productName)
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/hypotheses\/[0-9a-z]+$/)

  await page.goto('/hypotheses')
  // The card shows the key phrase; the full statement lives in the title.
  const card = page.locator('[draggable="true"]').filter({ has: byFullText(page, statement) })
  await expect(card).toBeVisible()

  // The card used to be a div with onClick — draggable, but with no tabIndex,
  // no role and no key handler, so it could not be reached from a keyboard.
  await expect(card.locator(`a[title="${statement}"]`)).toBeVisible()

  // Dragging between columns is the only pointer way to change status, so a
  // real link to the form is the keyboard equivalent.
  const edit = card.getByRole('link', { name: 'Изменить статус' })
  await expect(edit).toHaveAttribute('href', /\/hypotheses\/[^/]+\/edit$/)
  await edit.click()
  await page.waitForURL(/\/hypotheses\/[^/]+\/edit$/)
})

test('dashboard widgets can be reordered without dragging', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Настроить дашборд' }).click()

  const dialog = page.getByRole('dialog')
  const before = await dialog.locator('li').allInnerTexts()

  await dialog
    .getByRole('button', { name: /Переместить выше/ })
    .nth(1)
    .click()

  await expect
    .poll(async () => (await dialog.locator('li').allInnerTexts()).join('|'))
    .not.toBe(before.join('|'))

  // The first row cannot move up, so its button is disabled rather than a
  // no-op the user has to discover by pressing it.
  await expect(dialog.getByRole('button', { name: /Переместить выше/ }).first()).toBeDisabled()
})
