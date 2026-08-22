import { expect, test } from '@playwright/test'

test('dashboard loads with the chain navigation', async ({ page }) => {
  // Меню раскрыто явно, а не по стечению обстоятельств. Прогрессивное
  // раскрытие показывает только начало цепочки, пока за её пределами пусто, —
  // и раньше этот спек проходил лишь потому, что к моменту его запуска другие
  // спеки успевали создать данные в общей базе. Стоит прогнать его одному
  // (или после интеграционных тестов, которые базу очищают) — и он падал на
  // «Гипотезы», хотя приложение вело себя правильно. Само раскрытие
  // проверяется там, где ему и место: nav-disclosure.spec.ts.
  await page.addInitScript(() => window.localStorage.setItem('rpm:nav-stage', 'full'))
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'RPM Platform' })).toBeVisible()

  // Меню читается как метод, а не как список разделов (фаза 6 редизайна 2.1):
  // Обзор, затем пять звеньев цепочки по порядку, затем группы.
  const nav = page.locator('header nav')
  await expect(nav.getByRole('link', { name: 'Обзор' })).toBeVisible()
  for (const link of ['Сегменты', 'JTBD', 'Гипотезы', 'Фичи', 'Обещания']) {
    await expect(nav.getByRole('link', { name: link, exact: true })).toBeVisible()
  }
  for (const group of ['Доставка', 'База знаний', 'Команда']) {
    await expect(nav.getByRole('link', { name: group })).toBeVisible()
  }
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
