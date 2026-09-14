import { expect, test } from '@playwright/test'
import { createProductViaUI, productIdFromUrl, uniqueName } from './helpers'

// Одна область данных на экран (фаза 20, plans/2.3-scenario-audit-plan.md).
//
// Аудит нашёл, что дашборд под карточкой активного продукта считал всё по
// всей базе, «Пробелы» — по всем продуктам, плашка «Перейти в …» на чужой
// записи уводила в список, а формы в свежем браузере не подставляли продукт,
// который шапка уже назвала. Эти спеки закрепляют обратное. Общая тестовая
// база уже содержит чужие продукты и записи — именно это и делает проверку
// области честной: числа сходятся только если считаются по одному продукту.

async function addSegment(page: import('@playwright/test').Page, name: string) {
  await page.goto('/segments/new')
  await page.getByLabel('Название').fill(name)
  await page.getByRole('button', { name: 'Создать', exact: true }).click()
  await page.waitForURL(/\/segments\/c[a-z0-9]{10,}$/)
  return page.url()
}

test('дашборд считает цепочку и пробелы по активному продукту', async ({ page }) => {
  await createProductViaUI(page, uniqueName('Scope Product'))
  await addSegment(page, uniqueName('Scope Segment'))

  await page.goto('/')
  // Один сегмент, ни одной задачи: у продукта ровно «0 из 1», сколько бы
  // сегментов ни лежало в базе у других продуктов.
  const chain = page
    .getByRole('region', { name: 'Цепочка дискавери' })
    .or(page.locator('main').filter({ hasText: 'Цепочка дискавери' }))
  await expect(chain.getByText('0 из 1').first()).toBeVisible()
  await expect(page.getByTestId('dashboard-scope')).toContainText('Показатели ниже — по продукту')
  await expect(
    page.getByTestId('dashboard-scope').getByRole('link', { name: /CPO/ })
  ).toHaveAttribute('href', '/cpo')

  // Список считает тот же продукт, что и дашборд (фаза 23): «1» в цепочке —
  // это ровно одна строка в /segments, а не одна из многих в базе.
  await page.goto('/segments')
  const rows = page.locator('main ul.divide-y > li')
  await expect(rows).toHaveCount(1)
  await expect(rows.first()).toContainText('Scope Segment')
})

test('«Пробелы» открываются по активному продукту, «Все продукты» — явный режим', async ({
  page,
}) => {
  const productName = uniqueName('Gaps Scope Product')
  await createProductViaUI(page, productName)
  const segmentName = uniqueName('Gaps Scope Segment')
  await addSegment(page, segmentName)

  await page.goto('/reports/gaps')
  await expect(page.getByText(`Очередь по продукту «${productName}»`)).toBeVisible()
  // Сегмент без задач + продукт без исследований — и ничего чужого.
  await expect(page.getByText('Всего задач:')).toContainText('2')
  await expect(page.getByText(segmentName)).toBeVisible()

  await page.goto('/reports/gaps?productId=all')
  await expect(page.getByText('Очередь по всем продуктам')).toBeVisible()
  await expect(page.getByText(segmentName)).toBeVisible()
})

test('плашка чужой записи переключает продукт и оставляет на записи', async ({ page }) => {
  const ownerName = uniqueName('Owner Product')
  await createProductViaUI(page, ownerName)
  const segmentUrl = await addSegment(page, uniqueName('Owned Segment'))

  // Другой продукт становится активным — запись теперь «чужая».
  await createProductViaUI(page, uniqueName('Other Product'))

  await page.goto(segmentUrl)
  await expect(page.getByText('а сейчас активен другой')).toBeVisible()
  await page.getByRole('button', { name: `Перейти в «${ownerName}»` }).click()

  // Остались на той же карточке, плашки больше нет, в шапке — продукт записи.
  await expect(page.getByText('а сейчас активен другой')).toHaveCount(0)
  expect(new URL(page.url()).pathname).toBe(new URL(segmentUrl).pathname)
  await expect(page.locator('#active-product')).toContainText(ownerName)
})

test('форма создания подставляет продукт из шапки даже без cookie', async ({ page }) => {
  await createProductViaUI(page, uniqueName('Cookie-less Product'))
  await page.context().clearCookies()

  await page.goto('/segments/new')
  const trigger = page.locator('main').getByLabel('Продукт', { exact: true })
  await expect(trigger).not.toHaveText('Выберите продукт')
  // Тот же продукт, что назван в шапке (серверный fallback — общий).
  const headerProduct = page.locator('#active-product')
  if (await headerProduct.count()) {
    await expect(trigger).toHaveText(await headerProduct.innerText())
  }
})

test('хоткей n ведёт на форму с возвратом в список, как и кнопка', async ({ page }) => {
  await page.goto('/segments')
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('n')
  await page.waitForURL(/\/segments\/new\?from=%2Fsegments$/)
})

test('/pm с несуществующим productId говорит об этом, а не подменяет молча', async ({ page }) => {
  await createProductViaUI(page, uniqueName('PM Missing Product'))
  const url = await createProductViaUI(page, uniqueName('PM Deleted Product'))
  const deletedId = productIdFromUrl(url)

  await page.goto(`/pm/roadmap?productId=${deletedId}zzz`)
  await expect(page.getByText('Продукта из ссылки больше нет')).toBeVisible()
})
