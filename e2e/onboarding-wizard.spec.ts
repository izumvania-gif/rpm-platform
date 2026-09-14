import { expect, test } from '@playwright/test'
import { uniqueName } from './helpers'

test('creating a product in onboarding mode walks through all seven wizard steps', async ({
  page,
}) => {
  const productName = uniqueName('Onboarded Product')
  await page.goto('/products/new')
  await page.getByLabel('Название').fill(productName)
  await page.getByRole('button', { name: 'Создать и настроить →' }).click()
  await page.waitForURL(/\/onboarding\/segments$/)

  await expect(page.getByText('Шаг 1 из 7')).toBeVisible()
  const segmentName = uniqueName('Wizard Segment')
  await page.getByPlaceholder('Например: Банки топ-30').fill(segmentName)
  await page.getByRole('button', { name: 'Добавить' }).click()
  await expect(page.getByText(segmentName)).toBeVisible()

  const stepOrder = ['jtbd', 'research', 'hypotheses', 'competitors', 'people']
  for (const step of stepOrder) {
    await page.getByRole('link', { name: 'Далее →' }).click()
    await page.waitForURL(new RegExp(`/onboarding/${step}$`))
    if (step === 'jtbd') {
      // Единственный сегмент отмечен заранее (фаза 22 аудита 2.3): задача
      // без сегмента — первый же пробел, который потом покажет /reports/gaps.
      await expect(page.getByLabel(segmentName)).toBeChecked()
    }
  }

  // On the new "Люди" step, create a person on the spot and confirm they
  // land in the roster list (plans/2.0-ux-improvement-plan.md, раздел C).
  const personName = uniqueName('Wizard Teammate')
  await page.getByRole('button', { name: 'Новый человек' }).click()
  await page.getByPlaceholder('Имя').fill(personName)
  await page.getByRole('button', { name: 'Добавить', exact: true }).click()
  await expect(page.getByText(personName)).toBeVisible()

  await page.getByRole('link', { name: 'Далее →' }).click()
  await page.waitForURL(new RegExp('/onboarding/features$'))

  await page.getByRole('link', { name: 'Далее →' }).click()
  await page.waitForURL(/\/onboarding\/done$/)
  await expect(page.getByRole('heading', { name: 'Настройка продукта завершена' })).toBeVisible()

  const segmentsRow = page.locator('li', { hasText: 'Сегменты' })
  await expect(segmentsRow.getByText('1', { exact: true })).toBeVisible()
  const teamRow = page.locator('li', { hasText: 'Команда' })
  await expect(teamRow.getByText('1', { exact: true })).toBeVisible()

  await page.getByRole('link', { name: 'Перейти к продукту →' }).click()
  await page.waitForURL(/\/products\/c[a-z0-9]{10,}$/)
  await expect(page.getByRole('heading', { name: productName })).toBeVisible()
})

test('"Пропустить настройку" leaves the wizard for the product page directly', async ({ page }) => {
  const productName = uniqueName('Skip Wizard Product')
  await page.goto('/products/new')
  await page.getByLabel('Название').fill(productName)
  await page.getByRole('button', { name: 'Создать и настроить →' }).click()
  await page.waitForURL(/\/onboarding\/segments$/)

  await page.getByRole('link', { name: 'Пропустить настройку →' }).click()
  await page.waitForURL(/\/products\/c[a-z0-9]{10,}$/)
  await expect(page.getByRole('heading', { name: productName })).toBeVisible()
})

test('сегмент из мастера не остаётся в «Пробелах» без задачи', async ({ page }) => {
  // Аудит 2.3: мастер создавал сегмент, затем задачу — но не привязывал одну к
  // другой, и первый же продукт открывал «Пробелы» со строкой «Сегменты без
  // единого JTBD». С фазы 22 сегмент на шаге задач отмечен заранее; этот спек
  // держит следствие: пройденный мастер не оставляет за собой этот пробел.
  const productName = uniqueName('Gapless Wizard Product')
  await page.goto('/products/new')
  await page.getByLabel('Название').fill(productName)
  await page.getByRole('button', { name: 'Создать и настроить →' }).click()
  await page.waitForURL(/\/onboarding\/segments$/)
  const productId = new URL(page.url()).pathname.split('/')[2]

  const segmentName = uniqueName('Wizard Gapless Segment')
  await page.getByPlaceholder('Например: Банки топ-30').fill(segmentName)
  await page.getByRole('button', { name: 'Добавить' }).click()
  await expect(page.getByText(segmentName)).toBeVisible()

  await page.getByRole('link', { name: 'Далее →' }).click()
  await page.waitForURL(/\/onboarding\/jtbd$/)
  await page
    .getByPlaceholder('Когда …, я хочу …, чтобы …')
    .fill(uniqueName('Когда истекает сертификат, я хочу продлить его сам'))
  await page.getByPlaceholder('Категория').fill('Выпуск')
  await page.getByRole('button', { name: 'Добавить' }).click()
  // Задача записана вместе с сегментом — это видно тут же, в строке списка.
  await expect(
    page.locator('li', { hasText: 'Выпуск' }).filter({ hasText: segmentName })
  ).toBeVisible()

  await page.goto(`/reports/gaps?productId=${productId}`)
  await expect(page.getByText(`Очередь по продукту «${productName}»`)).toBeVisible()
  await expect(page.getByText('Сегменты без единого JTBD')).toHaveCount(0)
  await expect(page.getByText(segmentName)).toHaveCount(0)
})
