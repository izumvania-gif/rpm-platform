import { expect, test } from '@playwright/test'

// Прогрессивное раскрытие меню (plans/2.0-product-leap-plan.md, C1), после
// перекройки в меню-цепочку (фаза 6 редизайна 2.1).
//
// Общая тестовая база наполнена, поэтому выводимая стадия здесь всегда
// 'full' — свёрнутое меню фикстурами не получить. Спекигоняют явный
// override: это тот же путь отрисовки. Сама деривация и её свойство
// безопасности («базовый режим скрывает только пустое») проверяются в
// tests/integration/nav-stage.test.ts.

async function collapseNav(page: import('@playwright/test').Page) {
  await page.addInitScript(() => window.localStorage.setItem('rpm:nav-stage', 'basic'))
}

const nav = (page: import('@playwright/test').Page) => page.locator('header nav')

test('a collapsed nav shows only the start of the chain', async ({ page }) => {
  await collapseNav(page)
  await page.goto('/')

  await expect(nav(page).getByRole('link', { name: 'Обзор' })).toBeVisible()
  await expect(nav(page).getByRole('link', { name: 'Сегменты' })).toBeVisible()
  await expect(nav(page).getByRole('link', { name: 'JTBD', exact: true })).toBeVisible()

  // Дальше цепочки и групп в базовом режиме нет.
  await expect(nav(page).getByRole('link', { name: 'Гипотезы' })).toHaveCount(0)
  await expect(nav(page).getByRole('link', { name: 'Обещания' })).toHaveCount(0)
  await expect(nav(page).getByRole('link', { name: 'База знаний' })).toHaveCount(0)
})

test('hiding a link does not hide the route behind it', async ({ page }) => {
  await collapseNav(page)
  await page.goto('/')
  await expect(nav(page).getByRole('link', { name: 'Обещания' })).toHaveCount(0)

  // Доступно по адресу и в свёрнутом виде — это раскрытие, а не право доступа.
  const response = await page.goto('/marketing')
  expect(response?.ok()).toBe(true)

  // И раздел, на котором стоишь, возвращается в меню: оно не имеет права
  // спрятать страницу, которую человек сейчас открыл.
  await expect(nav(page).getByRole('link', { name: 'Обещания' })).toBeVisible()
})

test('the keyboard shortcut still reaches a hidden section', async ({ page }) => {
  await collapseNav(page)
  await page.goto('/')
  // `g` затем `m` — шорткат на /marketing; скрытая вкладка не отвязывает его.
  await page.keyboard.press('g')
  await page.keyboard.press('m')
  await page.waitForURL('/marketing')
})

test('the header toggle expands and collapses the chain without a reload', async ({ page }) => {
  await collapseNav(page)
  await page.goto('/')
  await expect(nav(page).getByRole('link', { name: 'Гипотезы' })).toHaveCount(0)

  // Переключатель живёт в шапке: плитку разделов на дашборде фаза 6 убрала,
  // и это теперь единственное — и всегда доступное — место управления.
  await page.getByRole('button', { name: 'Все разделы' }).click()
  await expect(nav(page).getByRole('link', { name: 'Гипотезы' })).toBeVisible()

  await page.getByRole('button', { name: 'Только основное' }).click()
  await expect(nav(page).getByRole('link', { name: 'Гипотезы' })).toHaveCount(0)
})
