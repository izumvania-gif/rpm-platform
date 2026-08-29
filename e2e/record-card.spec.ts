import { expect, test, type Page } from '@playwright/test'
import { createProductViaUI, selectOptionRobust, uniqueName } from './helpers'

// Единый шаблон карточки (фаза 8 редизайна 2.1).
//
// Главная опасность унификации названа прямо в плане: шаблон не имеет права
// убить инлайн-правку — она работает на двенадцати детальных страницах и это
// заметная часть ценности. Поэтому первый тест проверяет именно её, и сразу на
// всех типах, которые шаблон захватил.

/**
 * Кликнуть по полю, ввести новое значение и подтвердить.
 *
 * Подтверждение — потеря фокуса, а не Enter: в textarea Enter это перенос
 * строки, и сохраняет её только blur (`InlineEditableField` так и подписывает:
 * «Esc — отмена, клик вне поля — сохранить»). Один жест на оба типа поля.
 */
async function editInline(page: Page, current: string, next: string) {
  await page.getByRole('button', { name: current, exact: true }).click()
  const field = page.locator('input:focus, textarea:focus')
  await field.fill(next)
  await field.blur()
  await expect(page.getByRole('button', { name: next, exact: true })).toBeVisible()
}

test('на всех типах карточки заголовок правится кликом, а крошки на месте', async ({ page }) => {
  const productName = uniqueName('Record Card Product')
  await createProductViaUI(page, productName)

  const cases = [
    { module: 'segments', label: 'Сегменты', field: 'Название', name: uniqueName('Банки') },
    { module: 'features', label: 'Фичи', field: 'Название', name: uniqueName('Удалённый выпуск') },
    {
      module: 'marketing',
      label: 'Обещания',
      field: 'Формулировка обещания',
      name: uniqueName('Выпуск за 15 минут'),
    },
    {
      module: 'competitors',
      label: 'Конкуренты',
      field: 'Название',
      name: uniqueName('Acme Rival'),
    },
  ]

  for (const item of cases) {
    await page.goto(`/${item.module}/new`)
    await page.getByLabel(item.field, { exact: true }).fill(item.name)
    await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), productName)
    await page.getByRole('button', { name: 'Создать', exact: true }).click()
    await page.waitForURL(new RegExp(`/${item.module}/c[a-z0-9]{10,}`))

    // Крошки: продукт и раздел. До фазы 8 страница говорила, какому продукту
    // запись принадлежит, но не в каком разделе лежит.
    const crumbs = page.getByRole('navigation', { name: 'Хлебные крошки' })
    await expect(crumbs.getByRole('link', { name: productName })).toBeVisible()
    await expect(crumbs.getByRole('link', { name: item.label, exact: true })).toBeVisible()

    const renamed = `${item.name} (правлено)`
    await editInline(page, item.name, renamed)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(renamed)
  }
})

test('карточка JTBD тоже правится кликом — и говорит, что ей мешает', async ({ page }) => {
  const productName = uniqueName('Record Card JTBD Product')
  await createProductViaUI(page, productName)

  const title = uniqueName('Когда истекает сертификат, я хочу продлить его')
  await page.goto('/jtbd/new')
  await page.getByLabel('Формулировка JTBD').fill(title)
  await page.getByLabel('Категория').fill('Выпуск')
  await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), productName)
  await page.getByRole('button', { name: 'Создать', exact: true }).click()
  await page.waitForURL(/\/jtbd\/c[a-z0-9]{10,}/)

  const blockers = page.getByRole('region', { name: 'Что мешает' })
  await expect(blockers).toContainText('Не подтверждён исследованием')
  // Кнопка ведёт к привязке исследования, а не к галочке «подтверждён»:
  // подтверждение означает «есть исследование», и ставить его одним кликом
  // значило бы обманывать самого себя.
  await expect(blockers.getByRole('link', { name: 'Привязать исследование' })).toHaveAttribute(
    'href',
    /\/edit$/
  )

  const renamed = `${title} (правлено)`
  await editInline(page, title, renamed)
  await expect(page.getByRole('heading', { level: 1 })).toContainText(renamed)
})

test('«Что мешает» перечисляет пробелы конкурента и убирает исправленный', async ({ page }) => {
  const productName = uniqueName('Record Card Rival Product')
  await createProductViaUI(page, productName)

  const competitorName = uniqueName('Acme Blocker')
  await page.goto('/competitors/new')
  await page.getByLabel('Название', { exact: true }).fill(competitorName)
  await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), productName)
  await page.getByRole('button', { name: 'Создать', exact: true }).click()
  await page.waitForURL(/\/competitors\/c[a-z0-9]{10,}/)

  const blockers = page.getByRole('region', { name: 'Что мешает' })
  await expect(blockers).toContainText('Не описано позиционирование')
  await expect(blockers).toContainText('Не перечислено ни одной фичи конкурента')
  // «Давно не проверялся» — неверные слова про того, кого не проверяли ни
  // разу; это два разных факта и два разных текста.
  await expect(blockers).toContainText('Ни разу не проверялся')
  await expect(blockers).not.toContainText('Давно не проверялся')

  await editInline(page, '+ описать позиционирование', 'Играет на цене, но без интеграций')

  await expect(blockers).not.toContainText('Не описано позиционирование')
  await expect(blockers).toContainText('Не перечислено ни одной фичи конкурента')
})
