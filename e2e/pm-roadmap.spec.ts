import { expect, test } from '@playwright/test'
import { confirmDelete, createProductViaUI, selectOptionRobust, uniqueName } from './helpers'

test('add a roadmap item on /pm, see it grouped by quarter, then delete it', async ({ page }) => {
  const productName = uniqueName('Roadmap Product')
  const productUrl = await createProductViaUI(page, productName)
  const productId = productUrl.split('/').pop()!

  await page.goto(`/pm/roadmap?productId=${productId}`)
  await expect(page.getByRole('heading', { name: 'Доставка' })).toBeVisible()

  // Inline "Добавить пункт" (plans/2.0-ux-improvement-plan.md, Фаза 5) — no
  // navigation away from /pm at all, unlike the old full-page flow.
  await page.getByRole('button', { name: 'Добавить пункт' }).click()
  const itemTitle = uniqueName('Launch v2')
  await page.getByPlaceholder('Название').fill(itemTitle)
  await selectOptionRobust(page, page.getByLabel('Статус'), 'В работе')
  await page.getByPlaceholder('Квартал, напр. 2026 Q3').fill('2026 Q4')
  await page.getByRole('button', { name: 'Добавить', exact: true }).click()

  await expect(page.getByText('2026 Q4')).toBeVisible()
  await expect(page.getByText(itemTitle)).toBeVisible()
  await expect(page.getByText('В работе')).toBeVisible()

  await confirmDelete(page)
  await page.waitForURL(new RegExp(`/pm/roadmap\\?productId=${productId}`))
  await expect(page.getByText(itemTitle)).toHaveCount(0)
})

test('assigning a roadmap item owner shows their workload in the Команда section', async ({
  page,
}) => {
  const productName = uniqueName('Team Product')
  const productUrl = await createProductViaUI(page, productName)
  const productId = productUrl.split('/').pop()!

  const personName = uniqueName('Carol PM')
  await page.goto('/people/new')
  await page.getByLabel('Имя').fill(personName)
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/people\/(?!new)[^/]+$/)

  await page.goto(`/pm/roadmap/new?productId=${productId}`)
  await page.getByLabel('Название').fill(uniqueName('Ship feature'))
  await selectOptionRobust(page, page.getByLabel('Ответственный'), personName)
  await page.getByRole('button', { name: 'Добавить' }).click()
  await page.waitForURL(new RegExp(`/pm/roadmap\\?productId=${productId}`))

  // С фазы 9 «Команда» — своя вкладка, а не секция под роадмапом.
  await page
    .getByRole('navigation', { name: 'Разделы доставки' })
    .getByRole('link', { name: 'Команда' })
    .click()
  await page.waitForURL(new RegExp(`/pm/team\\?productId=${productId}`))

  // И строка роадмапа («Ответственный: Carol PM…»), и строка команды содержат
  // имя, поэтому проверяем нагрузку — она есть только в «Команде».
  await expect(page.getByText('1 активных · 1 всего')).toBeVisible()
})

test('the PM product switcher remembers the last selected product', async ({ page }) => {
  const productName = uniqueName('Switcher Product')
  await createProductViaUI(page, productName)

  await page.goto('/pm')
  await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), productName)
  await page.waitForURL(/\/pm\/roadmap\?productId=/)

  await page.goto('/pm')
  await expect(page).toHaveURL(/\/pm\/roadmap\?productId=/)
})

test('"+ Новый продукт" in the PM product switcher goes to the create-product form', async ({
  page,
}) => {
  const productName = uniqueName('Has A Product Already')
  await createProductViaUI(page, productName)

  await page.goto('/pm')
  await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), '+ Новый продукт')
  await page.waitForURL(/\/products\/new$/)
})
