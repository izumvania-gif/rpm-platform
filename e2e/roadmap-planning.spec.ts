import { expect, test } from '@playwright/test'
import { createProductViaUI, uniqueName } from './helpers'

// Planning a roadmap without leaving the Gantt.
//
// The round trip this removes: «Добавить пункт» creates an item with no dates,
// a bar needs both, so the item was invisible on this tab — you had to switch
// to «Список», open the full form, type two dates, save, come back and switch
// to «Гант» again. The tray is what makes the chart show everything it has.

async function addRoadmapItem(page: import('@playwright/test').Page, title: string) {
  await page.getByRole('button', { name: 'Добавить пункт' }).click()
  await page.getByPlaceholder('Название').fill(title)
  await page.getByRole('button', { name: 'Добавить', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Добавить пункт' })).toBeVisible()
}

test('a newly added item is visible on the Gantt, in the unscheduled tray', async ({ page }) => {
  const productName = uniqueName('Roadmap Tray Product')
  await createProductViaUI(page, productName)
  const productId = new URL(page.url()).pathname.split('/').pop()!

  await page.goto(`/pm?productId=${productId}`)
  const title = uniqueName('Пункт без дат')
  await addRoadmapItem(page, title)

  // Switch to the chart: before the tray, this item simply would not be here.
  await page.goto(`/pm?productId=${productId}&view=gantt`)
  await expect(page.getByText(/Не на диаграмме — \d+/)).toBeVisible()
  await expect(page.getByTitle(new RegExp(`${title} — нет дат`))).toBeVisible()
})

test('«с сегодня» puts an item on the timeline without opening a form', async ({ page }) => {
  const productName = uniqueName('Roadmap Schedule Product')
  await createProductViaUI(page, productName)
  const productId = new URL(page.url()).pathname.split('/').pop()!

  await page.goto(`/pm?productId=${productId}`)
  const title = uniqueName('Запланировать одним нажатием')
  await addRoadmapItem(page, title)

  await page.goto(`/pm?productId=${productId}&view=gantt`)
  const chip = page.getByTitle(new RegExp(title))
  await expect(chip).toBeVisible()

  // The keyboard-reachable half of the drag: without it the tray would be a
  // pointer-only feature.
  await chip.getByRole('button', { name: 'с сегодня' }).click()

  // It leaves the tray and becomes a bar — no navigation anywhere.
  await expect(page.getByTitle(new RegExp(`${title} — нет дат`))).toHaveCount(0)
  await expect(page.locator('[data-track-key]').first()).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`view=gantt`))
})
