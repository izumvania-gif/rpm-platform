import { expect, test } from '@playwright/test'
import { createProductViaUI, uniqueName } from './helpers'

// CSV import (plans/2.0-product-leap-plan.md, A2) and starter templates (A4).

test('imports a pasted spreadsheet, auto-mapping russian headers', async ({ page }) => {
  const productName = uniqueName('CSV Product')
  const productUrl = await createProductViaUI(page, productName)

  await page.goto(productUrl)
  await page.getByRole('button', { name: 'Импорт CSV' }).click()

  await page.getByRole('combobox', { name: 'Что импортируем' }).click()
  await page.getByRole('option', { name: 'Конкуренты' }).click()

  const stamp = Date.now()
  const first = `КриптоПро ${stamp}`
  const second = `Аладдин ${stamp}`

  // Semicolon separator (ru-locale Excel), a quoted field containing a comma,
  // russian headers, and a row missing the required name.
  await page
    .locator('textarea')
    .first()
    .fill(
      [
        'Название;Сайт;Позиционирование',
        `${first};https://cryptopro.ru;"СКЗИ, сертифицированное ФСТЭК"`,
        `${second};https://aladdin-rd.ru;Токены`,
        ';;строка без названия',
      ].join('\n')
    )

  // Two importable rows; the nameless one is reported as skipped, not silently
  // dropped.
  await expect(page.getByRole('button', { name: 'Импортировать (2)' })).toBeVisible()
  await expect(page.getByText('строк без «Название» пропущено: 1')).toBeVisible()

  await page.getByRole('button', { name: 'Импортировать (2)' }).click()
  await expect(page.getByRole('status')).toHaveText('Импортировано записей: 2')

  await page.goto('/competitors')
  await expect(page.getByText(first)).toBeVisible()
  await expect(page.getByText(second)).toBeVisible()
})

test('requires the mandatory column to be mapped before importing', async ({ page }) => {
  const productName = uniqueName('CSV Mapping Product')
  const productUrl = await createProductViaUI(page, productName)

  await page.goto(productUrl)
  await page.getByRole('button', { name: 'Импорт CSV' }).click()
  await page.locator('textarea').first().fill('колонка-а,колонка-б\nзначение,другое')

  // Nothing auto-maps from unknown headers, so import stays blocked.
  await expect(page.getByText('Назначьте колонку на «Название»')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Импортировать' })).toBeDisabled()

  // Map the first column by hand and it becomes importable.
  await page.getByRole('combobox', { name: 'Колонка 1' }).click()
  await page.getByRole('option', { name: 'Название *' }).click()
  await expect(page.getByRole('button', { name: 'Импортировать (1)' })).toBeEnabled()
})

test('a starter template fills a new product with linked segments, JTBD and hypotheses', async ({
  page,
}) => {
  const productName = uniqueName('Template Product')
  const productUrl = await createProductViaUI(page, productName)

  await page.goto(productUrl)
  await page.getByRole('button', { name: 'Взять заготовку' }).click()
  await page.getByRole('button', { name: 'Применить' }).first().click()

  // The panel unmounts once the product is no longer near-empty, so the
  // created content itself is the confirmation.
  //
  // The module cards cap at five rows and the template creates six jobs, so
  // asserting one specific title here would depend on which five the card
  // chose. The count in the card header is the claim that all six landed;
  // /reports/gaps below is the unabridged list.
  await expect(page.getByText('Банки топ-30')).toBeVisible()
  await expect(page.getByText('JTBD', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('6 не подтверждены')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Взять заготовку' })).toHaveCount(0)

  // Everything arrives unconfirmed, so it still has to earn its status.
  //
  // Template titles are fixed content, so unlike the rest of the suite they
  // cannot be uniqueName()'d — and /reports/gaps is user-wide, so every
  // earlier run of this spec against the shared test database leaves another
  // row with the same title. Assert that at least one is listed rather than
  // that exactly one is (strict mode would fail on the second run onwards).
  await page.goto('/reports/gaps')
  const gapRows = page.getByText('Выпустить сертификат сотруднику, не заставляя его ехать в офис')
  await expect(gapRows.first()).toBeVisible()
})
