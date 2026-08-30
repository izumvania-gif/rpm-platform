import { expect, test } from '@playwright/test'
import { createProductViaUI, selectOptionRobust, uniqueName } from './helpers'

test('create a competitor and add/remove a news log entry', async ({ page }) => {
  const productName = uniqueName('Competitor Product')
  await createProductViaUI(page, productName)

  const competitorName = uniqueName('Acme Rival')
  await page.goto('/competitors/new')
  await page.getByLabel('Название').fill(competitorName)
  await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), productName)
  await page.getByLabel('Модель ценообразования').fill('Per seat')
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/competitors\/c[a-z0-9]{10,}$/)
  await expect(page.getByRole('heading', { name: competitorName })).toBeVisible()

  const newsTitle = uniqueName('Raised a new funding round')
  await page.getByPlaceholder('Заголовок новости').fill(newsTitle)
  await page.getByRole('button', { name: 'Добавить запись' }).click()
  const newsItem = page.locator('li', { hasText: newsTitle })
  await expect(newsItem).toBeVisible()

  // Scoped to the news item — the page also has a "Удалить" button for the
  // competitor itself, further up, which must not be the one clicked here.
  await newsItem.getByRole('button', { name: 'Удалить' }).click()
  await expect(page.getByText(newsTitle)).toHaveCount(0)
})

test('Конкуренты живут в меню, под «Обещаниями» (§2.9.3)', async ({ page }) => {
  // Решение §2.9.3 в силе: конкуренты обязаны быть в меню, а не только
  // ссылкой с карточки продукта. Изменился родитель — в меню-цепочке (фаза 6
  // редизайна 2.1) они переехали из «Продуктов» в «Обещания»:
  // позиционирование строится против конкурентов, там ему и место.
  await page.addInitScript(() => window.localStorage.setItem('rpm:nav-stage', 'full'))
  await page.goto('/')

  const nav = page.locator('header nav')
  await nav.getByRole('link', { name: 'Обещания' }).hover()
  const competitorsLink = nav.getByRole('link', { name: 'Конкуренты' })
  await expect(competitorsLink).toBeVisible()
  await competitorsLink.click()
  await page.waitForURL('/competitors')
})
