import { expect, test } from '@playwright/test'
import { byFullText, createProductViaUI, uniqueName } from './helpers'

// Хаб продукта и карточки (фаза 21 аудита 2.3).
//
// Карточка продукта была хабом только дискавери; карточка JTBD молчала об
// инсайтах, карточка сегмента — о разговорах, инсайтах и гипотезах, хотя
// блок «Что мешает» их считал. Здесь проверяется, что всё это теперь на месте
// и что кнопки «Добавить …» приводят в форму с уже проставленной связью.

test('the product page shows delivery facts and links out to the hubs', async ({ page }) => {
  const productName = uniqueName('Hub Product')
  const productUrl = await createProductViaUI(page, productName)
  const productId = productUrl.split('/').pop()!

  await page.goto(productUrl)
  await expect(page.getByRole('heading', { name: 'Доставка и витрины' })).toBeVisible()

  // Пустой роадмап — не пустая строка, а приглашение.
  const delivery = page.getByText('пока пусто — добавить пункт')
  await expect(delivery).toHaveAttribute('href', `/pm/roadmap?productId=${productId}`)
  await expect(page.getByText('никого — собрать команду')).toHaveAttribute(
    'href',
    `/pm/team?productId=${productId}`
  )

  // Отчёты — по этому продукту, а не по активному.
  await expect(page.getByRole('link', { name: 'Матрица Сегменты × JTBD' })).toHaveAttribute(
    'href',
    `/reports/segments-jtbd?productId=${productId}`
  )
  await expect(page.getByRole('link', { name: 'Пробелы', exact: true })).toHaveAttribute(
    'href',
    `/reports/gaps?productId=${productId}`
  )
  await expect(page.getByRole('link', { name: 'Продажи', exact: true })).toHaveAttribute(
    'href',
    `/sales-hub?productId=${productId}`
  )

  // Пункт роадмапа появился — счётчик по статусу вместо приглашения.
  const itemTitle = uniqueName('Экспорт в PDF')
  await page.goto(`/pm/roadmap?productId=${productId}`)
  await page.getByRole('button', { name: 'Добавить пункт' }).click()
  await page.getByPlaceholder('Название').fill(itemTitle)
  await page.getByRole('button', { name: 'Добавить', exact: true }).click()
  await expect(page.getByText(itemTitle)).toBeVisible()

  await page.goto(productUrl)
  await expect(page.getByText('пока пусто — добавить пункт')).toHaveCount(0)
  await expect(page.getByText('запланировано')).toBeVisible()
})

test('a JTBD card lists its insights and prefills the link on «Добавить инсайт»', async ({
  page,
}) => {
  const productName = uniqueName('JTBD Insights Product')
  await createProductViaUI(page, productName)

  const title = uniqueName('Когда истекает сертификат, я хочу продлить его сам')
  await page.goto('/jtbd/new')
  await page.getByLabel('Формулировка JTBD').fill(title)
  await page.getByLabel('Категория').fill('Выпуск')
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/jtbd\/c[a-z0-9]{10,}/)
  const jtbdUrl = page.url()
  const jtbdId = jtbdUrl.split('/').pop()!

  await expect(page.getByRole('heading', { name: /^Инсайты/ })).toBeVisible()
  await expect(page.getByText(/на чём основана эта задача, пока не записано/)).toBeVisible()

  // Задача уже проставлена в ссылке — иначе кнопка отправляла бы искать её в
  // списке; что связь действительно записана, докажет секция после возврата.
  await page.getByRole('link', { name: 'Добавить инсайт' }).click()
  await page.waitForURL(new RegExp(`/insights/new\\?.*jtbdId=${jtbdId}`))
  const quote = uniqueName('Продлевать через офис — потерянный день')
  await page.getByLabel('Цитата или вывод').fill(quote)
  await page.getByRole('button', { name: 'Создать' }).click()

  // `from` вернул на карточку задачи, и инсайт уже в её секции.
  await page.waitForURL(jtbdUrl)
  await expect(page.getByRole('link', { name: quote })).toBeVisible()
})

test('a segment card shows its conversations, insights and hypotheses', async ({ page }) => {
  const productName = uniqueName('Segment Sections Product')
  await createProductViaUI(page, productName)

  const segmentName = uniqueName('Банки')
  await page.goto('/segments/new')
  await page.getByLabel('Название').fill(segmentName)
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/segments\/c[a-z0-9]{10,}/)
  const segmentUrl = page.url()

  for (const heading of ['Разговоры', 'Инсайты', 'Гипотезы']) {
    await expect(page.getByRole('heading', { name: new RegExp(`^${heading}`) })).toBeVisible()
  }
  await expect(page.getByText('С этим сегментом ещё не говорили.')).toBeVisible()

  // «Добавить гипотезу» приводит в форму с уже выбранным сегментом и
  // возвращает на карточку сегмента, где гипотеза уже в списке.
  await page.getByRole('link', { name: 'Добавить гипотезу' }).click()
  await page.waitForURL(/\/hypotheses\/new\?.*segmentId=/)
  const statement = uniqueName('Если выпускать удалённо, банки согласятся на пилот')
  await page.getByLabel('Формулировка гипотезы').fill(statement)
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(segmentUrl)
  await expect(byFullText(page, statement)).toBeVisible()
  // Счётчик секции — тот же факт, что читает блок «Что мешает».
  await expect(page.getByRole('heading', { name: /^Гипотезы \(1\)/ })).toBeVisible()
})
