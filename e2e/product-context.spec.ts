import { expect, test } from '@playwright/test'
import { createProductViaUI, productIdFromUrl, setActiveProduct, uniqueName } from './helpers'

// Активный продукт как контекст (фазы 4–5 редизайна 2.1).
//
// До этого списки показывали записи всех продуктов сразу, и «Сегменты» у
// человека с пятью продуктами были свалкой, в которой невозможно работать.

async function addSegment(page: import('@playwright/test').Page, name: string) {
  await page.goto('/segments/new')
  await page.getByLabel('Название').fill(name)
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/segments/)
}

test('a list shows only the active product, and the switcher changes it', async ({ page }) => {
  const productA = uniqueName('Context A')
  const urlA = await createProductViaUI(page, productA)
  const idA = productIdFromUrl(urlA)
  const segmentA = uniqueName('Сегмент из A')
  await addSegment(page, segmentA)

  const productB = uniqueName('Context B')
  const urlB = await createProductViaUI(page, productB)
  const idB = productIdFromUrl(urlB)
  const segmentB = uniqueName('Сегмент из B')
  await addSegment(page, segmentB)

  // Создание продукта делает его активным (createProduct пишет cookie), так
  // что сейчас активен B.
  await page.goto('/segments')
  await expect(page.getByRole('link', { name: segmentB })).toBeVisible()
  await expect(page.getByRole('link', { name: segmentA })).toHaveCount(0)

  // Переключение продукта в шапке меняет содержимое списка без ухода со
  // страницы.
  await setActiveProduct(page, idA)
  await page.goto('/segments')
  await expect(page.getByRole('link', { name: segmentA })).toBeVisible()
  await expect(page.getByRole('link', { name: segmentB })).toHaveCount(0)

  // И это не «спрятали навсегда»: продукт B по-прежнему свой и доступен.
  await setActiveProduct(page, idB)
  await page.goto('/segments')
  await expect(page.getByRole('link', { name: segmentB })).toBeVisible()
})

test('the header switcher is a real control that reloads the list', async ({ page }) => {
  const productA = uniqueName('Switcher A')
  await createProductViaUI(page, productA)
  const segmentA = uniqueName('Сегмент свитчера A')
  await addSegment(page, segmentA)

  const productB = uniqueName('Switcher B')
  await createProductViaUI(page, productB)
  const segmentB = uniqueName('Сегмент свитчера B')
  await addSegment(page, segmentB)

  await page.goto('/segments')
  await expect(page.getByRole('link', { name: segmentB })).toBeVisible()

  // Выбор в переключателе — это отправка формы Server Action'у, а не запись
  // cookie с клиента: сервер обязан перерисовать список.
  const switcher = page.getByRole('combobox', { name: 'Активный продукт' })
  await switcher.click()
  await page.getByRole('option', { name: productA }).click()

  await expect(page.getByRole('link', { name: segmentA })).toBeVisible()
  await expect(page.getByRole('link', { name: segmentB })).toHaveCount(0)
})
