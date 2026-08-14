import { expect, test } from '@playwright/test'
import { confirmDelete, createProductViaUI, selectOptionRobust, uniqueName } from './helpers'

// The delete dialog (plans/2.0-hardening-plan.md, B4). What matters here is
// not that a delete still works — segments.spec/product-crud.spec cover that
// — but that the user is shown the size of the cascade first, and that
// backing out of the dialog really does leave everything alone.

test('the dialog counts the cascade before the delete goes through', async ({ page }) => {
  const productName = uniqueName('Blast Radius Product')
  const productUrl = await createProductViaUI(page, productName)

  for (const segment of ['Первый', 'Второй']) {
    await page.goto('/segments/new')
    await page.getByLabel('Название').fill(uniqueName(segment))
    await selectOptionRobust(page, page.getByLabel('Продукт'), productName)
    await page.getByRole('button', { name: 'Создать' }).click()
    await page.waitForURL(/\/segments\/[^/]+$/)
  }

  const jtbdTitle = uniqueName('Задача')
  await page.goto('/jtbd/new')
  await page.getByLabel('Формулировка JTBD').fill(jtbdTitle)
  await page.getByLabel('Категория').fill('к')
  await selectOptionRobust(page, page.getByLabel('Продукт'), productName)
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/jtbd\/[^/]+$/)

  await page.goto(productUrl)
  await page.getByRole('button', { name: 'Удалить' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText(`«${productName}»`)).toBeVisible()

  // The numbers, not just the warning: the old confirm() had neither.
  await expect(dialog.getByText('Будет удалено вместе с этой записью:')).toBeVisible()
  await expect(dialog.getByText('— 2 сегмента', { exact: true })).toBeVisible()
  await expect(dialog.getByText('— 1 JTBD', { exact: true })).toBeVisible()

  // Backing out must be free — this is the escape hatch that makes showing a
  // scary number useful rather than just alarming.
  await dialog.getByRole('button', { name: 'Отмена' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('heading', { name: productName })).toBeVisible()

  await confirmDelete(page)
  await page.waitForURL('/products')
  await expect(page.getByText(productName)).toHaveCount(0)
})

test('a record with nothing hanging off it says so', async ({ page }) => {
  const personName = uniqueName('Одинокий человек')
  await page.goto('/people/new')
  await page.getByLabel('Имя').fill(personName)
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/people\/[^/]+$/)

  await page.getByRole('button', { name: 'Удалить' }).click()
  const dialog = page.getByRole('dialog')
  // Silence would read as "we didn't check"; an explicit answer is the point.
  await expect(dialog.getByText('Связанных записей нет.')).toBeVisible()

  await dialog.getByRole('button', { name: 'Удалить' }).click()
  await page.waitForURL('/people')
})

test('the dialog can be closed from the keyboard without deleting', async ({ page }) => {
  const personName = uniqueName('Отменённое удаление')
  await page.goto('/people/new')
  await page.getByLabel('Имя').fill(personName)
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/people\/[^/]+$/)

  await page.getByRole('button', { name: 'Удалить' }).click()
  // Focus starts on Отмена, not on the destructive button: a stray Enter or
  // Space on an opening dialog must not be what deletes a product.
  await expect(page.getByRole('button', { name: 'Отмена' })).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: personName })).toBeVisible()
})
