import { expect, test } from '@playwright/test'
import { createProductViaUI, selectRadixOption, uniqueName } from './helpers'

// Creating the record a picker is missing, without abandoning the form.
//
// The cost this removes is not a click. These are plain server-rendered forms
// with no draft anywhere, so leaving to create a missing study/person/job
// throws away everything already typed — and the picker is usually reached
// after the long fields are filled in.

test('a study can be created from inside the JTBD form, keeping what was typed', async ({
  page,
}) => {
  const productName = uniqueName('Inline Research Product')
  await createProductViaUI(page, productName)
  const productId = new URL(page.url()).pathname.split('/').pop()!

  await page.goto(`/jtbd/new?productId=${productId}`)
  const title = uniqueName('Когда истекает сертификат, я хочу продлить его сам')
  await page.getByLabel('Формулировка JTBD').fill(title)
  await page.getByLabel('Категория').fill('Выпуск')

  const researchTitle = uniqueName('Интервью с ИБ')
  await page.getByRole('button', { name: '+ Новое исследование' }).click()
  await page.getByPlaceholder('Название исследования').fill(researchTitle)
  // The type is asked, not defaulted — it drives the research cadence report.
  await selectRadixOption(page, page.getByLabel('Тип исследования'), 'Качественное')
  await page.getByRole('button', { name: 'Создать исследование' }).click()

  // By role, not by label: "Исследование" is also a substring of the
  // «Подтверждено исследованием» checkbox's label further down the form.
  const picker = page.getByRole('combobox', { name: 'Исследование' })
  await expect(picker).toContainText(researchTitle)
  await expect(page.getByLabel('Формулировка JTBD')).toHaveValue(title)
  await expect(page.getByLabel('Категория')).toHaveValue('Выпуск')

  await page.getByRole('button', { name: 'Создать', exact: true }).click()
  await page.waitForURL(/\/jtbd\/c[a-z0-9]{10,}/)
  await expect(page.getByText(researchTitle)).toBeVisible()
})

test('an owner can be created from the roadmap form on /pm', async ({ page }) => {
  const productName = uniqueName('Inline Person Product')
  await createProductViaUI(page, productName)
  const productId = new URL(page.url()).pathname.split('/').pop()!

  await page.goto(`/pm/roadmap?productId=${productId}`)
  await page.getByRole('button', { name: 'Добавить пункт' }).click()

  const itemTitle = uniqueName('Пункт с новым ответственным')
  await page.getByPlaceholder('Название').fill(itemTitle)

  const personName = uniqueName('Новый Ответственный')
  await page.getByRole('button', { name: '+ Новый человек' }).click()
  await page.getByPlaceholder('Имя').fill(personName)
  await page.getByRole('button', { name: 'Создать человека' }).click()

  await expect(page.getByRole('combobox', { name: 'Ответственный' })).toContainText(personName)
  // The half-filled item survived the detour.
  await expect(page.getByPlaceholder('Название')).toHaveValue(itemTitle)

  await page.getByRole('button', { name: 'Добавить', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Добавить пункт' })).toBeVisible()
  await expect(page.getByText(personName).first()).toBeVisible()
})
