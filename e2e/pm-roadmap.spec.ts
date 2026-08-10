import { expect, test } from '@playwright/test'
import { createProductViaUI, selectOptionRobust, uniqueName } from './helpers'

test('add a roadmap item on /pm, see it grouped by quarter, then delete it', async ({ page }) => {
  const productName = uniqueName('Roadmap Product')
  const productUrl = await createProductViaUI(page, productName)
  const productId = productUrl.split('/').pop()!

  await page.goto(`/pm?productId=${productId}`)
  await expect(page.getByRole('heading', { name: 'PM' })).toBeVisible()

  await page.getByRole('link', { name: 'Добавить пункт' }).click()
  await page.waitForURL(/\/pm\/roadmap\/new\?productId=/)

  const itemTitle = uniqueName('Launch v2')
  await page.getByLabel('Название').fill(itemTitle)
  await selectOptionRobust(page, page.getByLabel('Статус'), 'В работе')
  await page.getByLabel('Квартал').fill('2026 Q4')
  await page.getByRole('button', { name: 'Добавить' }).click()
  await page.waitForURL(new RegExp(`/pm\\?productId=${productId}`))

  await expect(page.getByText('2026 Q4')).toBeVisible()
  await expect(page.getByText(itemTitle)).toBeVisible()
  await expect(page.getByText('В работе')).toBeVisible()

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Удалить' }).click()
  await page.waitForURL(new RegExp(`/pm\\?productId=${productId}`))
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
  await page.waitForURL(new RegExp(`/pm\\?productId=${productId}`))

  // Both the roadmap item ("Ответственный: Carol PM…") and the Команда row
  // contain the person's name, so scope on the workload text instead — it
  // only ever appears in the Команда section.
  await expect(page.getByText('1 активных · 1 всего')).toBeVisible()
})

test('the PM product switcher remembers the last selected product', async ({ page }) => {
  const productName = uniqueName('Switcher Product')
  await createProductViaUI(page, productName)

  await page.goto('/pm')
  await selectOptionRobust(page, page.getByLabel('Продукт'), productName)
  await page.waitForURL(/\/pm\?productId=/)

  await page.goto('/pm')
  await expect(page).toHaveURL(/\/pm\?productId=/)
})

test('"+ Новый продукт" in the PM product switcher goes to the create-product form', async ({
  page,
}) => {
  const productName = uniqueName('Has A Product Already')
  await createProductViaUI(page, productName)

  await page.goto('/pm')
  await selectOptionRobust(page, page.getByLabel('Продукт'), '+ Новый продукт')
  await page.waitForURL(/\/products\/new$/)
})
