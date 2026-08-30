import { expect, test } from '@playwright/test'
import { createProductViaUI, selectOptionRobust, selectRadixOption, uniqueName } from './helpers'

// Разрыв цепочки чинится там, где он виден (фаза 7 редизайна 2.1).
//
// Проверяем ровно то, что обещает кнопка: клик по пустому слоту, выбор — и
// связь есть, БЕЗ перезагрузки страницы. Отсутствие перезагрузки здесь не
// придирка: если бы слот вёл на форму, всё остальное тоже «работало бы», и
// тест ничего бы не поймал. Поэтому перед действием в окно кладётся метка, и
// после — проверяется, что она пережила.

async function markPage(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    ;(window as unknown as { __chainGapMark?: boolean }).__chainGapMark = true
  })
}

async function markSurvived(page: import('@playwright/test').Page) {
  return page.evaluate(
    () => (window as unknown as { __chainGapMark?: boolean }).__chainGapMark === true
  )
}

test('пустой слот ленты связывает с существующим сегментом, не уходя со страницы', async ({
  page,
}) => {
  const productName = uniqueName('Chain Gap Product')
  await createProductViaUI(page, productName)

  const segmentName = uniqueName('Банки')
  await page.goto('/segments/new')
  await page.getByLabel('Название').fill(segmentName)
  await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), productName)
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/segments\/c[a-z0-9]{10,}$/)

  // Задача заводится БЕЗ сегмента — разрыв нужен настоящий.
  const jtbdTitle = uniqueName('Когда истекает сертификат, я хочу продлить его')
  await page.goto('/jtbd/new')
  await page.getByLabel('Формулировка JTBD').fill(jtbdTitle)
  await page.getByLabel('Категория').fill('Выпуск')
  await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), productName)
  await page.getByRole('button', { name: 'Создать', exact: true }).click()
  await page.waitForURL(/\/jtbd\/c[a-z0-9]{10,}/)

  const ribbon = page.getByRole('navigation', { name: 'Цепочка связей этой записи' })
  await expect(ribbon).toContainText('не привязан')

  // «Маркетинг» на карточке задачи — разрыв через два звена: обещание крепится
  // к фиче, а не к задаче. Там осталась обычная ссылка, и это осознанно.
  await expect(ribbon.getByRole('link', { name: 'добавить' })).toBeVisible()

  await markPage(page)
  await ribbon.getByRole('button', { name: 'связать с сегментом' }).click()
  await selectRadixOption(page, page.getByLabel('Сегмент для этой задачи'), segmentName)
  // exact: обычное совпадение по подстроке накрыло бы и «связать с сегментом».
  await page.getByRole('button', { name: 'Связать', exact: true }).click()

  await expect(ribbon.getByRole('link', { name: segmentName })).toBeVisible()
  expect(await markSurvived(page)).toBe(true)

  // И связь настоящая, а не только на экране.
  await page.reload()
  await expect(ribbon.getByRole('link', { name: segmentName })).toBeVisible()
})

test('из разрыва можно создать новую запись и она сразу связывается', async ({ page }) => {
  const productName = uniqueName('Chain Gap Create Product')
  await createProductViaUI(page, productName)

  const featureName = uniqueName('Удалённый выпуск')
  await page.goto('/features/new')
  await page.getByLabel('Название').fill(featureName)
  await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), productName)
  await page.getByRole('button', { name: 'Создать', exact: true }).click()
  await page.waitForURL(/\/features\/c[a-z0-9]{10,}/)

  const ribbon = page.getByRole('navigation', { name: 'Цепочка связей этой записи' })
  await markPage(page)
  await ribbon.getByRole('button', { name: 'связать с обещанием' }).click()

  // Выбирать не из чего — у продукта нет ни одного обещания. Ровно тот случай,
  // ради которого рядом с пикером живёт инлайн-создание.
  await expect(page.getByText('Свободных обещаний нет')).toBeVisible()

  const rtbStatement = uniqueName('Выпуск за 15 минут')
  await page.getByRole('button', { name: '+ Новое обещание' }).click()
  await page.getByPlaceholder('Формулировка обещания').fill(rtbStatement)
  await page.getByRole('button', { name: 'Создать обещание' }).click()

  await expect(ribbon.getByRole('link', { name: rtbStatement })).toBeVisible()
  expect(await markSurvived(page)).toBe(true)

  await page.reload()
  await expect(ribbon.getByRole('link', { name: rtbStatement })).toBeVisible()
})
