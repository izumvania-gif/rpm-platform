import { expect, test } from '@playwright/test'
import { createProductViaUI, uniqueName } from './helpers'

// Filling a product in bulk: the records, then the links between them.
//
// The two halves are tested together because they are one workflow — a batch
// of pasted records is worth nothing to the reports until it is attached, and
// attaching through the edit forms is the round trip this page removes.

test('a whole list of JTBD is pasted at once, under one category', async ({ page }) => {
  const productName = uniqueName('Bulk JTBD Product')
  const productUrl = await createProductViaUI(page, productName)
  await page.goto(productUrl)

  const category = uniqueName('Категория')
  await page.getByRole('button', { name: 'Добавить списком' }).click()
  await page.getByLabel('Что добавляем').click()
  await page.getByRole('option', { name: 'JTBD', exact: true }).click()

  const first = uniqueName('Продлить сертификат самому')
  await page.getByRole('textbox').last().fill(`${first}\nВыдать доступ новому сотруднику`)

  // Category is required by the model, so the batch is refused until it is
  // given rather than filled in on the user's behalf.
  const add = page.getByRole('button', { name: /^Добавить \(2\)$/ })
  await expect(add).toBeDisabled()
  await page.getByLabel('Категория').fill(category)
  await expect(add).toBeEnabled()
  await add.click()

  await expect(page.getByRole('status')).toContainText('Добавлено записей: 2')

  await page.goto('/jtbd')
  await expect(page.getByText(category).first()).toBeVisible()
})

test('links are ticked on a grid instead of through each record’s form', async ({ page }) => {
  const productName = uniqueName('Links Product')
  const productUrl = await createProductViaUI(page, productName)
  await page.goto(productUrl)
  const productId = new URL(page.url()).pathname.split('/').pop()!

  // Two records, one of each side of the relation, both pasted.
  const segmentName = uniqueName('Банки')
  await page.getByRole('button', { name: 'Добавить списком' }).click()
  await page.getByRole('textbox').last().fill(segmentName)
  await page.getByRole('button', { name: /^Добавить \(1\)$/ }).click()
  await expect(page.getByRole('status')).toContainText('Добавлено записей: 1')

  const jtbdTitle = uniqueName('Продлить сертификат')
  await page.getByLabel('Что добавляем').click()
  await page.getByRole('option', { name: 'JTBD', exact: true }).click()
  await page.getByRole('textbox').last().fill(jtbdTitle)
  await page.getByLabel('Категория').fill('Выпуск')
  await page.getByRole('button', { name: /^Добавить \(1\)$/ }).click()
  await expect(page.getByRole('status')).toContainText('Добавлено записей: 1')

  await page.goto(`/products/${productId}/links`)

  const cell = page.getByRole('checkbox', { name: `${jtbdTitle} — ${segmentName}` })
  await expect(cell).toHaveAttribute('aria-checked', 'false')
  await expect(page.getByText('Без связи: 1 из 1')).toBeVisible()

  // The tick is optimistic, so it appears before the write lands — arm the
  // wait first, or the reload below races the Server Action still in flight.
  const written = page.waitForResponse(
    (response) => response.request().method() === 'POST' && response.status() === 200
  )
  await cell.click()
  await expect(cell).toHaveAttribute('aria-checked', 'true')
  // No navigation — the whole point is that forty of these cost no page loads.
  await expect(page).toHaveURL(`/products/${productId}/links`)
  await written

  // And it is really written, not just optimistic state.
  await page.reload()
  await expect(
    page.getByRole('checkbox', { name: `${jtbdTitle} — ${segmentName}` })
  ).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByText('Все строки связаны — 1 из 1')).toBeVisible()
})
