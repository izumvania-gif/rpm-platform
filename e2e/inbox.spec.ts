import { expect, test } from '@playwright/test'
import { byFullText, createProductViaUI, uniqueName } from './helpers'

// The Inbox (plans/2.0-product-leap-plan.md, B1) — one paste, several types.

test('one mixed paste becomes records of five different types', async ({ page }) => {
  const productName = uniqueName('Inbox Product')
  const productUrl = await createProductViaUI(page, productName)
  const productId = productUrl.split('/').pop()!

  await page.goto(`/inbox?productId=${productId}`)

  const stamp = Date.now()
  const segment = `Банки топ-30 ${stamp}`
  const insight = `«Мы не можем ждать неделю ${stamp}»`
  const hypothesis = `Если убрать визит в офис, то онбординг ускорится ${stamp}`
  const feature = `Нужна возможность массового отзыва ${stamp}`
  const competitor = `Основной конкурент — КриптоПро ${stamp}`

  // Bullets, a blank line and a repeat — notes as they actually arrive.
  await page
    .getByRole('textbox', { name: 'Вставьте текст' })
    .fill([segment, `- ${insight}`, '', hypothesis, feature, competitor, segment].join('\n'))

  // Five distinct types were guessed from one paste, and the duplicate line
  // was dropped, so five items remain rather than six.
  await expect(page.getByText('Сегменты: 1')).toBeVisible()
  await expect(page.getByText('Инсайты: 1')).toBeVisible()
  await expect(page.getByText('Гипотезы: 1')).toBeVisible()
  await expect(page.getByText('Фичи: 1')).toBeVisible()
  await expect(page.getByText('Конкуренты: 1')).toBeVisible()

  await page.getByRole('button', { name: 'Добавить (5)' }).click()
  await expect(page.getByRole('status')).toContainText('Добавлено 5')

  // Each record landed in its own module.
  await page.goto('/segments')
  await expect(page.getByText(segment)).toBeVisible()
  await page.goto('/hypotheses')
  // The kanban card shows the key phrase, so anchor on the full text's tooltip.
  await expect(byFullText(page, hypothesis)).toBeVisible()
  await page.goto('/features')
  await expect(page.getByText(feature)).toBeVisible()
  await page.goto('/competitors')
  await expect(page.getByText(competitor)).toBeVisible()
})

test('a guessed type can be overridden, and an item excluded, before saving', async ({ page }) => {
  const productName = uniqueName('Inbox Override Product')
  const productUrl = await createProductViaUI(page, productName)
  const productId = productUrl.split('/').pop()!

  await page.goto(`/inbox?productId=${productId}`)

  const stamp = Date.now()
  const willBecomeFeature = `Экспорт отчёта ${stamp}`
  // Deliberately keyword-free prose: an earlier draft of this test used
  // "Не нужно сохранять …", whose «нужно» correctly trips the feature rule,
  // so the Фичи count was already 1 before the override under test.
  const excluded = `Клиент упомянул это вскользь ${stamp}`

  await page
    .getByRole('textbox', { name: 'Вставьте текст' })
    .fill([willBecomeFeature, excluded].join('\n'))

  // First line is a short unpunctuated phrase -> segment; the second is
  // ordinary prose -> insight by default.
  await expect(page.getByText('Сегменты: 1')).toBeVisible()
  await expect(page.getByText('Инсайты: 1')).toBeVisible()

  // Override the first to a feature.
  await page.getByRole('combobox', { name: 'Тип записи item-0' }).click()
  await page.getByRole('option', { name: 'Фичи' }).click()
  await expect(page.getByText('Фичи: 1')).toBeVisible()
  await expect(page.getByText('Сегменты: 1')).toHaveCount(0)

  // Exclude the second line entirely.
  await page.getByRole('checkbox', { name: `Включить: ${excluded}` }).uncheck()

  await page.getByRole('button', { name: 'Добавить (1)' }).click()
  await expect(page.getByRole('status')).toContainText('Добавлено 1')

  await page.goto('/features')
  await expect(page.getByText(willBecomeFeature)).toBeVisible()
  await page.goto('/insights')
  await expect(page.getByText(excluded)).toHaveCount(0)
})

test('nothing is written until the button is pressed', async ({ page }) => {
  const productName = uniqueName('Inbox Dry Run Product')
  const productUrl = await createProductViaUI(page, productName)
  const productId = productUrl.split('/').pop()!

  await page.goto(`/inbox?productId=${productId}`)
  const draft = uniqueName('Черновик который не сохраняем')
  await page.getByRole('textbox', { name: 'Вставьте текст' }).fill(draft)
  await expect(page.getByText('Ничего не сохраняется, пока не нажата кнопка')).toBeVisible()

  // Navigate away without confirming.
  await page.goto('/insights')
  await expect(page.getByText(draft)).toHaveCount(0)
})

test('the Инбокс header action reaches the page', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Инбокс' }).click()
  await page.waitForURL('/inbox')
  await expect(page.getByRole('heading', { name: 'Инбокс' })).toBeVisible()
})
