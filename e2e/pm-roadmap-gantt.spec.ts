import { expect, test } from '@playwright/test'
import { createProductViaUI, uniqueName } from './helpers'

test('switching to the Гант tab renders tracked bars grouped by block and a milestone line', async ({
  page,
}) => {
  const productName = uniqueName('Gantt Product')
  const productUrl = await createProductViaUI(page, productName)
  const productId = productUrl.split('/').pop()!

  const trackGroup = uniqueName('Разработка')
  const barTitle = uniqueName('Frontend redesign')
  await page.goto(`/pm/roadmap/new?productId=${productId}`)
  await page.getByLabel('Название').fill(barTitle)
  await page.getByLabel('Блок (группа дорожек)').fill(trackGroup)
  await page.getByLabel('Дорожка', { exact: true }).fill('Фронт')
  await page.locator('#startDate').fill('2026-09-01')
  await page.locator('#endDate').fill('2026-09-20')
  await page.getByRole('button', { name: 'Добавить' }).click()
  await page.waitForURL(new RegExp(`/pm\\?productId=${productId}`))

  const milestoneTitle = uniqueName('v3.0')
  await page.goto(`/pm/roadmap/new?productId=${productId}`)
  await page.getByLabel('Название').fill(milestoneTitle)
  await page.locator('#startDate').fill('2026-09-10')
  await page.getByLabel('Это веха', { exact: false }).check()
  await page.getByRole('button', { name: 'Добавить' }).click()
  await page.waitForURL(new RegExp(`/pm\\?productId=${productId}`))

  // List view is the default landing state for /pm.
  await expect(page.getByRole('link', { name: 'Список' })).toBeVisible()

  await page.getByRole('link', { name: 'Гант' }).click()
  await page.waitForURL(new RegExp(`/pm\\?productId=${productId}&view=gantt`))

  await expect(page.getByText(trackGroup)).toBeVisible()
  await expect(page.getByText('Фронт', { exact: true })).toBeVisible()
  await expect(page.getByText(barTitle)).toBeVisible()
  await expect(page.getByText(milestoneTitle)).toBeVisible()
})

// Фаза 6 (plans/2.0-ux-improvement-plan.md, раздел D) — the chart becomes
// draggable. Pointer Events drag needs a manual mouse.move/down/up gesture,
// not Playwright's dragTo() (that's built for HTML5 DnD). Every drag target
// is scrolled into view first — the chart sits well below the fold on a
// fresh product page, and mouse events at coordinates outside the viewport
// are silently dropped (they never reach elementFromPoint's hit-test).

test('dragging a bar body moves both dates, dragging its edge resizes one', async ({ page }) => {
  const productName = uniqueName('Gantt Drag Product')
  const productUrl = await createProductViaUI(page, productName)
  const productId = productUrl.split('/').pop()!

  const barTitle = uniqueName('Backend work')
  await page.goto(`/pm/roadmap/new?productId=${productId}`)
  await page.getByLabel('Название').fill(barTitle)
  await page.getByLabel('Блок (группа дорожек)').fill('Разработка')
  await page.getByLabel('Дорожка', { exact: true }).fill('Бэк')
  await page.locator('#startDate').fill('2026-09-05')
  await page.locator('#endDate').fill('2026-09-15')
  await page.getByRole('button', { name: 'Добавить' }).click()
  await page.waitForURL(new RegExp(`/pm\\?productId=${productId}`))

  await page.goto(`/pm?productId=${productId}&view=gantt`)
  const bar = page.locator(`div[title^="${barTitle}"]`)
  await bar.scrollIntoViewIfNeeded()
  const box = (await bar.boundingBox())!

  // Move the whole bar to the right — both dates should shift by the same
  // amount, so the duration (10 days) stays the same.
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2, { steps: 8 })
  await page.mouse.up()
  await expect(page.getByText('Не удалось сохранить', { exact: false })).toHaveCount(0)
  await page.waitForLoadState('networkidle')

  const editHref = await page
    .locator('a[href^="/pm/roadmap/"][href$="/edit"]')
    .first()
    .getAttribute('href')
  expect(editHref).toBeTruthy()

  await page.goto(editHref!)
  const movedStart = await page.locator('#startDate').inputValue()
  const movedEnd = await page.locator('#endDate').inputValue()
  expect(movedStart).not.toBe('2026-09-05')
  expect(movedEnd).not.toBe('2026-09-15')
  const durationDays =
    (new Date(movedEnd).getTime() - new Date(movedStart).getTime()) / (24 * 60 * 60 * 1000)
  expect(durationDays).toBe(10)

  // Resize the right edge — only the end date should move, start stays put.
  await page.goto(`/pm?productId=${productId}&view=gantt`)
  const barAfterMove = page.locator(`div[title^="${barTitle}"]`)
  await barAfterMove.scrollIntoViewIfNeeded()
  const box2 = (await barAfterMove.boundingBox())!
  await page.mouse.move(box2.x + box2.width - 2, box2.y + box2.height / 2)
  await page.mouse.down()
  await page.mouse.move(box2.x + box2.width - 2 + 120, box2.y + box2.height / 2, { steps: 8 })
  await page.mouse.up()
  await page.waitForLoadState('networkidle')

  await page.goto(editHref!)
  const resizedStart = await page.locator('#startDate').inputValue()
  const resizedEnd = await page.locator('#endDate').inputValue()
  expect(resizedStart).toBe(movedStart)
  expect(new Date(resizedEnd).getTime()).toBeGreaterThan(new Date(movedEnd).getTime())
})

test('dragging a milestone moves its date, and its edit link is keyboard-reachable', async ({
  page,
}) => {
  const productName = uniqueName('Gantt Milestone Drag Product')
  const productUrl = await createProductViaUI(page, productName)
  const productId = productUrl.split('/').pop()!

  const milestoneTitle = uniqueName('v4.0')
  await page.goto(`/pm/roadmap/new?productId=${productId}`)
  await page.getByLabel('Название').fill(milestoneTitle)
  await page.locator('#startDate').fill('2026-09-15')
  await page.getByLabel('Это веха', { exact: false }).check()
  await page.getByRole('button', { name: 'Добавить' }).click()
  await page.waitForURL(new RegExp(`/pm\\?productId=${productId}`))

  await page.goto(`/pm?productId=${productId}&view=gantt`)
  // Целимся в саму ручку перетаскивания, а не «на 15px ниже подписи»:
  // арифметика от подписи ломалась от любого изменения вертикального ритма
  // страницы (её сломала строка контекста продукта в шапке, фаза 5).
  // Наводимся на саму ручку перетаскивания через `hover`, а не считаем
  // координату арифметикой от подписи: Playwright сам проскроллит элемент в
  // видимую область и выберет точку, по которой действительно попадёт.
  // Прежний вариант («на 15px ниже подписи») держался на том, что диаграмма
  // помещалась во вьюпорт без прокрутки — строка контекста продукта в шапке
  // (фаза 5) это сломала, и нажатие стало уходить мимо. Ручка `inset-y-0`, во
  // всю высоту диаграммы, поэтому целимся у её верхнего края.
  const handle = page.locator('[data-milestone-handle]').first()
  await handle.hover({ position: { x: 1, y: 8 } })
  const box = (await handle.boundingBox())!
  await page.mouse.down()
  await page.mouse.move(box.x - 60, box.y + 8, { steps: 8 })
  await page.mouse.up()
  await page.waitForLoadState('networkidle')

  const editHref = await page
    .locator('a[href^="/pm/roadmap/"][href$="/edit"]')
    .first()
    .getAttribute('href')
  await page.goto(editHref!)
  const movedDate = await page.locator('#startDate').inputValue()
  expect(movedDate).not.toBe('2026-09-15')

  // Keyboard path: the edit link is a real <a>, reachable and activatable
  // without a pointer — this is the resolution to the plan's open
  // accessibility question for Фаза 6 (a visible "Редактировать" link next
  // to each bar/milestone, not arrow-key hijacking).
  await page.goto(`/pm?productId=${productId}&view=gantt`)
  const keyboardEditLink = page.getByRole('link', { name: /Изменить дату/ })
  await keyboardEditLink.focus()
  await expect(keyboardEditLink).toBeFocused()
  await page.keyboard.press('Enter')
  await page.waitForURL(/\/pm\/roadmap\/.+\/edit/)
})

test('dragging a bar vertically onto another track row reassigns its track (/pm only)', async ({
  page,
}) => {
  const productName = uniqueName('Gantt Track Drag Product')
  const productUrl = await createProductViaUI(page, productName)
  const productId = productUrl.split('/').pop()!

  const barTitle = uniqueName('Reassign me')
  await page.goto(`/pm/roadmap/new?productId=${productId}`)
  await page.getByLabel('Название').fill(barTitle)
  await page.getByLabel('Блок (группа дорожек)').fill('Разработка')
  await page.getByLabel('Дорожка', { exact: true }).fill('Фронт')
  await page.locator('#startDate').fill('2026-09-01')
  await page.locator('#endDate').fill('2026-09-10')
  await page.getByRole('button', { name: 'Добавить' }).click()
  await page.waitForURL(new RegExp(`/pm\\?productId=${productId}`))

  // A second track in the same block, so there's somewhere to drop onto —
  // buildGanttLayout only renders a track row that has at least one item.
  await page.goto(`/pm/roadmap/new?productId=${productId}`)
  await page.getByLabel('Название').fill(uniqueName('Anchor'))
  await page.getByLabel('Блок (группа дорожек)').fill('Разработка')
  await page.getByLabel('Дорожка', { exact: true }).fill('Бэк')
  await page.locator('#startDate').fill('2026-09-01')
  await page.locator('#endDate').fill('2026-09-10')
  await page.getByRole('button', { name: 'Добавить' }).click()
  await page.waitForURL(new RegExp(`/pm\\?productId=${productId}`))

  await page.goto(`/pm?productId=${productId}&view=gantt`)
  const bar = page.locator(`div[title^="${barTitle}"]`)
  await bar.scrollIntoViewIfNeeded()
  const box = (await bar.boundingBox())!
  // Tracks sort alphabetically (ru locale) with "Без трека" last — "Бэк"
  // (Б) sorts before "Фронт" (Ф), so it renders as the row above. Rows are
  // h-10 = 40px each.
  const targetY = box.y + box.height / 2 - 40

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2, targetY, { steps: 8 })
  await page.mouse.up()
  await page.waitForLoadState('networkidle')

  const editHref = await page
    .locator(`a[href^="/pm/roadmap/"][href$="/edit"]`)
    .first()
    .getAttribute('href')
  await page.goto(editHref!)
  await expect(page.getByLabel('Дорожка', { exact: true })).toHaveValue('Бэк')
})
