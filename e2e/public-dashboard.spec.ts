import { expect, test } from '@playwright/test'
import { createProductViaUI, selectOptionRobust, uniqueName } from './helpers'

test('shows a product with its public summary and owner, and only public roadmap items', async ({
  page,
}) => {
  const productName = uniqueName('Public Product')
  const productUrl = await createProductViaUI(page, productName)
  const productId = productUrl.split('/').pop()!

  const personName = uniqueName('Dana Owner')
  const personRole = uniqueName('Head of Product')
  await page.goto('/people/new')
  await page.getByLabel('Имя').fill(personName)
  await page.getByLabel('Роль / должность').fill(personRole)
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/people\/(?!new)[^/]+$/)

  const publicSummary = uniqueName('Открытое описание продукта')
  await page.goto(`/products/${productId}/edit`)
  await selectOptionRobust(page, page.getByLabel('Ответственный PM'), personName)
  await page.getByLabel('Публичное описание (для открытого дашборда компании)').fill(publicSummary)
  await page.getByRole('button', { name: 'Сохранить' }).click()
  await page.waitForURL(new RegExp(`/products/${productId}$`))

  const publicItemTitle = uniqueName('Public feature')
  await page.goto(`/pm/roadmap/new?productId=${productId}`)
  await page.getByLabel('Название').fill(publicItemTitle)
  await selectOptionRobust(
    page,
    page.getByLabel('Видимость'),
    'Публичный (виден на открытом дашборде компании)'
  )
  await page.getByLabel('Квартал').fill('2026 Q4')
  await page.getByRole('button', { name: 'Добавить' }).click()
  await page.waitForURL(new RegExp(`/pm/roadmap\\?productId=${productId}`))

  const internalItemTitle = uniqueName('Internal-only item')
  await page.goto(`/pm/roadmap/new?productId=${productId}`)
  await page.getByLabel('Название').fill(internalItemTitle)
  await page.getByRole('button', { name: 'Добавить' }).click()
  await page.waitForURL(new RegExp(`/pm/roadmap\\?productId=${productId}`))

  await page.goto('/public')
  await expect(page.getByRole('heading', { name: 'Компания' })).toBeVisible()
  // The product name shows up twice — once in the product card, once next
  // to its public roadmap item — so scope to "at least one" instead of a
  // single unique match.
  await expect(page.getByText(productName).first()).toBeVisible()
  await expect(page.getByText(publicSummary)).toBeVisible()
  await expect(page.getByText(personRole)).toBeVisible()
  await expect(page.getByText(publicItemTitle)).toBeVisible()
  await expect(page.getByText(internalItemTitle)).toHaveCount(0)
})
