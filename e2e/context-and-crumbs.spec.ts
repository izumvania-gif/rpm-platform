import { expect, test } from '@playwright/test'
import { createProductViaUI, uniqueName } from './helpers'

// Фазы 14–15 плана 2.2: контекст продукта до конца, возврат и «где я».

test('открыть карточку продукта — значит выбрать его: цепочка идёт следом', async ({ page }) => {
  const first = uniqueName('Ctx First')
  const second = uniqueName('Ctx Second')
  await createProductViaUI(page, first)
  const secondUrl = await createProductViaUI(page, second) // активным стал второй

  // Переходим на карточку ПЕРВОГО продукта не через переключатель, а по ссылке —
  // как из /cpo или из поиска. Раньше cookie оставался на втором.
  // Имя ссылки-карточки — это имя + бейдж стадии + слаг, поэтому ищем по
  // заголовку внутри, а не по точному имени ссылки.
  await page.goto('/products')
  await page
    .getByRole('link')
    .filter({ has: page.getByRole('heading', { name: first }) })
    .click()
  await page.waitForURL(/\/products\/[0-9a-z]+$/)
  expect(page.url()).not.toBe(secondUrl)

  // Шапка знает про смену: комбобокс активного продукта показывает первый.
  await expect(page.getByLabel('Активный продукт')).toHaveText(first)

  // И цепочка тоже: «Доставка» открывается на первом, без единого клика.
  await page.goto('/pm')
  await expect(page.getByRole('heading', { name: first })).toBeVisible()
})

test('вкладки «Доставки» видны как карта раздела, а не только после выбора', async ({ page }) => {
  await createProductViaUI(page, uniqueName('Tabs Product'))
  await page.goto('/pm')
  const tabs = page.getByRole('navigation', { name: 'Разделы доставки' })
  await expect(tabs).toBeVisible()
  for (const label of ['Роадмап', 'Гант', 'Процессы', 'Экшн-планы', 'Команда продукта']) {
    await expect(tabs.getByRole('link', { name: label })).toBeVisible()
  }
})

test('у гипотезы есть крошки: продукт / раздел', async ({ page }) => {
  const productName = uniqueName('Crumbs Product')
  await createProductViaUI(page, productName)

  const statement = uniqueName('Если дать сейлам ответ без продакта')
  await page.goto('/hypotheses/new')
  await page.getByLabel('Формулировка').fill(statement)
  await page.getByRole('button', { name: 'Создать' }).click()
  // Создание приземляет на карточку (фаза 24 плана 2.4). `c[a-z0-9]{10,}`,
  // а не `[^/]+`: последнему удовлетворяет и сам `/hypotheses/new`.
  await page.waitForURL(/\/hypotheses\/c[a-z0-9]{10,}$/)

  const crumbs = page.getByRole('navigation', { name: 'Хлебные крошки' })
  await expect(crumbs.getByRole('link', { name: productName })).toBeVisible()
  await expect(crumbs.getByRole('link', { name: 'Гипотезы' })).toBeVisible()

  // Крошка ведёт в список, где запись видна.
  await crumbs.getByRole('link', { name: 'Гипотезы' }).click()
  await page.waitForURL(/\/hypotheses$/)
})

test('вкладка браузера называет раздел и запись, а не платформу', async ({ page }) => {
  const productName = uniqueName('Title Product')
  await createProductViaUI(page, productName)

  await page.goto('/segments')
  await expect(page).toHaveTitle('Сегменты — RPM')

  await page.goto('/pm/roadmap')
  await expect(page).toHaveTitle('Роадмап — RPM')

  // Карточка называется именем записи.
  await page.goto('/products')
  await page
    .getByRole('link')
    .filter({ has: page.getByRole('heading', { name: productName }) })
    .click()
  await page.waitForURL(/\/products\/[0-9a-z]+$/)
  await expect(page).toHaveTitle(`${productName} — RPM`)
})
