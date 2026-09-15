import { expect, test } from '@playwright/test'
import { byFullText, createProductViaUI, selectRadixOption, uniqueName } from './helpers'

// Исследование знает, что на него опирается (фаза 26 плана 2.4, F6).
//
// До этого связь «задача ↔ исследование» ставилась только из формы задачи, а
// карточка исследования показывала одни инсайты. Здесь секции задач, гипотез
// и разговоров с пикером «привязать существующую» — тем же паттерном, что
// «Добавить доказательство» на гипотезе, — и всё без единого перехода.

test('карточка исследования привязывает задачу, гипотезу и разговор на месте', async ({ page }) => {
  await createProductViaUI(page, uniqueName('Research Links Product'))

  const jtbdTitle = uniqueName('Когда истекает сертификат, я хочу продлить его сам')
  await page.goto('/jtbd/new')
  await page.getByLabel('Формулировка JTBD').fill(jtbdTitle)
  await page.getByLabel('Категория').fill('Выпуск')
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/jtbd\/c[a-z0-9]{10,}/)

  const conversationTitle = uniqueName('Звонок с банком')
  await page.goto('/conversations/new')
  await page.getByLabel('Название').fill(conversationTitle)
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/conversations\/c[a-z0-9]{10,}$/)

  const researchTitle = uniqueName('Интервью с банками')
  await page.goto('/research/new')
  await page.getByLabel('Название').fill(researchTitle)
  await page.getByRole('button', { name: 'Создать', exact: true }).click()
  await page.waitForURL(/\/research\/c[a-z0-9]{10,}$/)
  const researchUrl = page.url()

  // Задача — из списка свободных; привязка ставит и флаг «подтверждена».
  const jobs = page.locator('div').filter({
    has: page.getByRole('heading', { name: /^Задачи, подтверждённые этим исследованием/ }),
  })
  await jobs.getByRole('button', { name: '+ Привязать задачу' }).click()
  const jobPicker = page.getByRole('group', { name: 'Привязать задачу' })
  await jobPicker.getByLabel('Задача').click()
  await page.getByRole('option', { name: /Продлить его сам/ }).click()
  await jobPicker.getByRole('button', { name: 'Привязать' }).click()
  await expect(byFullText(page, jtbdTitle).first()).toBeVisible()
  await expect(page.getByText('не отмечена подтверждённой')).toHaveCount(0)

  // Гипотеза — создаётся в пикере и сразу привязывается.
  const hypotheses = page
    .locator('div')
    .filter({ has: page.getByRole('heading', { name: /^Гипотезы/ }) })
  await hypotheses.getByRole('button', { name: '+ Привязать гипотезу' }).click()
  const hypothesisPicker = page.getByRole('group', { name: 'Привязать гипотезу' })
  await hypothesisPicker.getByRole('button', { name: '+ Новая гипотеза' }).click()
  const statement = uniqueName('Если убрать визит, то онбординг ускорится')
  await hypothesisPicker.getByPlaceholder('Мы верим, что …').fill(statement)
  await hypothesisPicker.getByRole('button', { name: 'Создать гипотезу' }).click()
  await expect(byFullText(page, statement)).toBeVisible()

  // Разговор — из списка свободных.
  const conversations = page
    .locator('div')
    .filter({ has: page.getByRole('heading', { name: /^Разговоры/ }) })
  await conversations.getByRole('button', { name: '+ Привязать разговор' }).click()
  const conversationPicker = page.getByRole('group', { name: 'Привязать разговор' })
  await selectRadixOption(page, conversationPicker.getByLabel('Разговор'), conversationTitle)
  await conversationPicker.getByRole('button', { name: 'Привязать' }).click()
  await expect(
    conversations.getByRole('link', { name: conversationTitle, exact: true })
  ).toBeVisible()

  // Ни одного перехода: страница та же.
  expect(page.url()).toBe(researchUrl)

  // Обратная сторона: задача теперь подтверждена этим исследованием.
  await page.getByRole('link', { name: /Продлить его сам/ }).click()
  await page.waitForURL(/\/jtbd\/c[a-z0-9]{10,}$/)
  await expect(page.getByText('Подтверждён', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: researchTitle })).toBeVisible()
})

test('«Дополнительно» сворачивает редкие поля и раскрыто, когда они уже заполнены', async ({
  page,
}) => {
  await createProductViaUI(page, uniqueName('More Fields Product'))

  // Пустая форма задачи: исследование, флаг, комментарий и теги свёрнуты.
  await page.goto('/jtbd/new')
  await expect(page.getByLabel('Комментарий')).toBeHidden()
  await page.getByText('Дополнительно', { exact: true }).click()
  await expect(page.getByLabel('Комментарий')).toBeVisible()

  // При редактировании записи с заполненным редким полем блок открыт сразу.
  const title = uniqueName('Когда меняется ключ, я хочу перевыпустить сертификат')
  await page.getByLabel('Формулировка JTBD').fill(title)
  await page.getByLabel('Категория').fill('Выпуск')
  await page.getByLabel('Комментарий').fill('Спросить у ИБ')
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/jtbd\/c[a-z0-9]{10,}/)
  await page.getByRole('link', { name: 'Редактировать' }).click()
  await page.waitForURL(/\/edit$/)
  await expect(page.getByLabel('Комментарий')).toBeVisible()
  await expect(page.getByLabel('Комментарий')).toHaveValue('Спросить у ИБ')
})
