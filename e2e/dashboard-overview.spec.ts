import { expect, test } from '@playwright/test'
import { createProductViaUI, selectOptionRobust, uniqueName } from './helpers'

// Постоянная часть дашборда (фаза 10 редизайна 2.1).
//
// Раньше «Цепочка дискавери» и «Пробелы» были виджетами, которые можно
// спрятать, а вывод про слабое звено — сноской под пятью полосками. Теперь это
// каркас страницы: вопросы «где мы» и «что решать» задаёт каждый, кто
// открывает главную.

test('дашборд показывает цепочку, слабое звено и очередь решений постоянно', async ({ page }) => {
  const productName = uniqueName('Overview Product')
  await createProductViaUI(page, productName)

  // Сегмент без задач — гарантированный разрыв в цепочке, то есть слабое
  // звено, которое плашка обязана назвать.
  const segmentName = uniqueName('Сегмент без задач')
  await page.goto('/segments/new')
  await page.getByLabel('Название').fill(segmentName)
  await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), productName)
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/segments\/c[a-z0-9]{10,}$/)

  await page.goto('/')

  // Двоеточие, а не тире: сквозное убрало автоматический нижний регистр, из-за
  // которого «JTBD» превращалось в «jtbd», и фраза перестроилась под то, чтобы
  // название звена сохраняло свой регистр.
  await expect(page.getByText('Слабое звено:')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Что делать' })).toHaveAttribute(
    'href',
    '/reports/gaps'
  )

  // Цепочка и пробелы — на месте и вне настраиваемой сетки.
  await expect(page.getByRole('heading', { name: 'Цепочка дискавери' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Пробелы' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Требуют решения' })).toBeVisible()

  // Спрятать их больше нельзя: из реестра виджетов они ушли.
  await page.getByRole('button', { name: 'Настроить дашборд' }).click()
  const panel = page.getByRole('dialog', { name: 'Настроить дашборд' })
  await expect(panel.getByText('Цепочка дискавери')).toHaveCount(0)
  await expect(panel.getByText('Пробелы')).toHaveCount(0)
})

test('очередь решений молчит, пока гипотеза не собрала полный набор', async ({ page }) => {
  const productName = uniqueName('Decision Queue Product')
  await createProductViaUI(page, productName)

  const statement = uniqueName('Если выпускать удалённо, то банки согласятся')
  await page.goto('/hypotheses/new')
  await page.getByLabel('Формулировка гипотезы').fill(statement)
  await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), productName)
  await page.getByRole('button', { name: 'Создать', exact: true }).click()
  await page.waitForURL(/\/hypotheses$/)

  await page.goto('/')
  // Гипотеза есть, но у неё нет ни критерия, ни доказательств, ни адресата —
  // решать по ней нечего, и очередь обязана это признать, а не показать её.
  await expect(page.getByText('Решать пока нечего')).toBeVisible()
  await expect(page.getByText(statement)).toHaveCount(0)
})
