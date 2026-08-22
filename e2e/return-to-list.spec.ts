import { expect, test } from '@playwright/test'
import { createProductViaUI, selectRadixOption, uniqueName } from './helpers'

// Where saving lands you.
//
// «Новый JTBD» used to leave you on the new record's own page rather than back
// on the list you came from, so adding several in a row meant walking back
// each time. The link now carries where it came from and the action honours
// it — but that value reaches the server from a hidden field, so it is only
// ever honoured when it is a path on this site.

test('saving from a list page returns to the list, not to the new record', async ({ page }) => {
  const productName = uniqueName('Return To List Product')
  await createProductViaUI(page, productName)

  await page.goto('/jtbd')
  await page.getByRole('link', { name: 'Новый JTBD' }).click()
  await page.waitForURL(/\/jtbd\/new\?from=%2Fjtbd|\/jtbd\/new\?from=\/jtbd/)

  const title = uniqueName('Когда я добавляю подряд, я хочу остаться в списке')
  await page.getByLabel('Формулировка JTBD').fill(title)
  await page.getByLabel('Категория').fill('Навигация')
  await selectRadixOption(
    page,
    page.getByRole('combobox', { name: 'Продукт', exact: true }),
    productName
  )
  await page.getByRole('button', { name: 'Создать', exact: true }).click()

  await page.waitForURL(/\/jtbd$/)
  await expect(page).toHaveURL(/\/jtbd$/)
})

test('an off-site destination is ignored, not followed', async ({ page }) => {
  const productName = uniqueName('Hostile Redirect Product')
  await createProductViaUI(page, productName)

  await page.goto('/segments/new?from=https://evil.example/steal')
  const name = uniqueName('Сегмент несмотря на чужой адрес')
  await page.getByLabel('Название').fill(name)
  await selectRadixOption(
    page,
    page.getByRole('combobox', { name: 'Продукт', exact: true }),
    productName
  )
  await page.getByRole('button', { name: 'Создать', exact: true }).click()

  // Falls back to the action's own destination — the new segment's page.
  await page.waitForURL(/\/segments\/c[a-z0-9]{10,}/)
  await expect(page).toHaveURL(/localhost/)
})
