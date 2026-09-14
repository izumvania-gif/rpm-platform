import { expect, test } from '@playwright/test'
import { createProductViaUI, selectOptionRobust, uniqueName } from './helpers'

// Карточка гипотезы: доказательства, баланс и чек-лист готовности
// (фаза 3 редизайна 2.1, plans/2.1-redesign-plan.md).
//
// Главное, что здесь проверяется, — инвариант чек-листа: он считает **факты**,
// а не счётчики. Пустая гипотеза не может показывать полный балл, а привязка
// настоящего инсайта обязана его пересчитать.

test('an empty hypothesis is honest about having nothing to decide on', async ({ page }) => {
  const productName = uniqueName('Evidence Product')
  await createProductViaUI(page, productName)

  const statement = uniqueName('Если добавить экспорт в PDF, отдел продаж перестанет просить')
  await page.goto('/hypotheses/new')
  await page.getByLabel('Формулировка гипотезы').fill(statement)
  await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), productName)
  await page.getByRole('button', { name: 'Создать' }).click()
  // Создание приземляет прямо на карточку (фаза 24 плана 2.4).
  await page.waitForURL(/\/hypotheses\/c[a-z0-9]{10,}$/)

  // Ничего не заполнено: 0 из 4, и ни одного очка за пустоту.
  await expect(page.getByText('0 из 4')).toBeVisible()
  await expect(
    page.getByText(
      'Ни одного доказательства не привязано — по этой гипотезе пока нечего взвешивать.'
    )
  ).toBeVisible()

  // Кнопки «что с этим делать» стоят на строках невыполненных условий — и без
  // «ассистента»/аватара «AI»: правила детерминированные (правка 4 плана).
  await expect(page.getByRole('link', { name: 'К критерию' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'К доказательствам' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Связать с фичей' })).toBeVisible()
  await expect(page.getByText('Ассистент')).toHaveCount(0)

  // «К доказательствам» ведёт в пикер, а не к пустому списку (фаза 21 аудита
  // 2.3): по якорю панель открывается сама.
  await page.getByRole('link', { name: 'К доказательствам' }).click()
  await expect(page.getByRole('button', { name: '+ Добавить доказательство' })).toHaveAttribute(
    'aria-expanded',
    'true'
  )
  await expect(page.getByRole('group', { name: 'Добавить доказательство' })).toBeVisible()
})

test('linking an insight recounts the checklist and moves the balance', async ({ page }) => {
  const productName = uniqueName('Balance Product')
  await createProductViaUI(page, productName)

  const statement = uniqueName('Если ускорить выпуск, клиенты перестанут уходить')
  await page.goto('/hypotheses/new')
  await page.getByLabel('Формулировка гипотезы').fill(statement)
  await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), productName)
  await page.getByRole('button', { name: 'Создать' }).click()
  // Создание приземляет прямо на карточку (фаза 24 плана 2.4).
  await page.waitForURL(/\/hypotheses\/c[a-z0-9]{10,}$/)
  const hypothesisUrl = page.url()

  await expect(page.getByText('0 из 4')).toBeVisible()

  // Критерий правится прямо на карточке, инлайн — отдельная форма ради одного
  // поля была бы лишним переходом.
  // InlineEditableField сохраняет по потере фокуса, отдельной кнопки у него
  // нет («Esc — отмена, клик вне поля — сохранить»).
  const criterion = 'Отток в сегменте падает хотя бы на четверть за квартал'
  await page.getByRole('button', { name: /при каком результате/ }).click()
  const criterionField = page.getByRole('textbox').last()
  await criterionField.fill(criterion)
  await criterionField.blur()
  await expect(page.getByText(criterion)).toBeVisible()
  await expect(page.getByText('1 из 4')).toBeVisible()

  // «Добавить доказательство» — пикер на месте (фаза 21 аудита 2.3): новый
  // инсайт создаётся и привязывается, не уходя с карточки. Полная форма
  // осталась за «Все поля →» — с уже проставленной гипотезой.
  await page.getByRole('button', { name: '+ Добавить доказательство' }).click()
  const panel = page.getByRole('group', { name: 'Добавить доказательство' })
  await expect(panel.getByRole('link', { name: 'Все поля →' })).toHaveAttribute(
    'href',
    /insights\/new\?productId=.+&hypothesisId=c[a-z0-9]{10,}/
  )
  await selectOptionRobust(page, panel.getByLabel('Сторона доказательства'), 'Подтверждает')
  await panel.getByRole('button', { name: '+ Новый инсайт' }).click()
  const quote = uniqueName('Ждём выпуск неделю, за это время клиент уходит')
  await panel.getByLabel('Текст инсайта').fill(quote)
  await panel.getByRole('button', { name: 'Создать инсайт' }).click()

  // Никакого перехода: карточка та же, доказательство уже в списке.
  await expect(page.getByTitle(quote)).toBeVisible()
  await expect(page).toHaveURL(hypothesisUrl)

  await expect(page.getByText('За: 1')).toBeVisible()
  await expect(page.getByText('Против: 0')).toBeVisible()
  // Одно доказательство — ещё не три: балл остаётся 1 из 4 (засчитан только
  // критерий), и чек-лист прямо говорит, сколько не хватает. Именно это и
  // значит «условия считаются по фактам, а не по счётчикам».
  await expect(page.getByText('Привязано 1 — нужно ещё 2')).toBeVisible()
  await expect(page.getByText('1 из 4')).toBeVisible()
})

test('the evidence filter shows one side at a time', async ({ page }) => {
  const productName = uniqueName('Filter Product')
  await createProductViaUI(page, productName)

  const statement = uniqueName('Если убрать визит в офис, конверсия вырастет')
  await page.goto('/hypotheses/new')
  await page.getByLabel('Формулировка гипотезы').fill(statement)
  await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), productName)
  await page.getByRole('button', { name: 'Создать' }).click()
  // Создание приземляет прямо на карточку (фаза 24 плана 2.4).
  await page.waitForURL(/\/hypotheses\/c[a-z0-9]{10,}$/)
  const hypothesisUrl = page.url()

  const forQuote = uniqueName('«Визит в офис — главная причина, почему мы тянем»')
  const againstQuote = uniqueName('«Нам наоборот спокойнее приехать и подписать лично»')

  for (const [quote, stance] of [
    [forQuote, 'Подтверждает'],
    [againstQuote, 'Опровергает'],
  ] as const) {
    await page.goto(hypothesisUrl)
    await page.getByRole('button', { name: '+ Добавить доказательство' }).click()
    const panel = page.getByRole('group', { name: 'Добавить доказательство' })
    await selectOptionRobust(page, panel.getByLabel('Сторона доказательства'), stance)
    await panel.getByRole('button', { name: '+ Новый инсайт' }).click()
    await panel.getByLabel('Текст инсайта').fill(quote)
    await panel.getByRole('button', { name: 'Создать инсайт' }).click()
    await expect(page.getByTitle(quote)).toBeVisible()
  }

  await expect(page.getByText('За: 1')).toBeVisible()
  await expect(page.getByText('Против: 1')).toBeVisible()

  // Ссылки фильтра ищутся внутри своего ориентира: «За» иначе совпадает и с
  // другими ссылками, начинающимися на эти буквы.
  const filter = page.getByRole('navigation', { name: 'Фильтр доказательств' })

  // «За» оставляет только подтверждающее.
  await filter.getByRole('link', { name: /^За/ }).click()
  await page.waitForURL(/stance=supports/)
  await expect(page.getByTitle(forQuote)).toBeVisible()
  await expect(page.getByTitle(againstQuote)).toHaveCount(0)

  await filter.getByRole('link', { name: /^Против/ }).click()
  await page.waitForURL(/stance=contradicts/)
  await expect(page.getByTitle(againstQuote)).toBeVisible()
  await expect(page.getByTitle(forQuote)).toHaveCount(0)

  await filter.getByRole('link', { name: /^Все/ }).click()
  await expect(page.getByTitle(forQuote)).toBeVisible()
  await expect(page.getByTitle(againstQuote)).toBeVisible()
})

test('the picker attaches an insight that already exists, and stops offering it', async ({
  page,
}) => {
  const productName = uniqueName('Picker Product')
  await createProductViaUI(page, productName)

  // Инсайт записан заранее — из разговора, без гипотезы: ровно тот случай,
  // ради которого пикер и появился (фаза 21 аудита 2.3).
  const insightText = uniqueName('Клиенты ждут выпуск неделю и уходят к конкуренту')
  await page.goto('/insights/new')
  await page.getByLabel('Цитата или вывод').fill(insightText)
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/insights\/c[a-z0-9]{10,}/)

  const statement = uniqueName('Если ускорить выпуск, отток упадёт')
  await page.goto('/hypotheses/new')
  await page.getByLabel('Формулировка гипотезы').fill(statement)
  await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), productName)
  await page.getByRole('button', { name: 'Создать' }).click()
  // Создание приземляет прямо на карточку (фаза 24 плана 2.4).
  await page.waitForURL(/\/hypotheses\/c[a-z0-9]{10,}$/)

  await page.getByRole('button', { name: '+ Добавить доказательство' }).click()
  const panel = page.getByRole('group', { name: 'Добавить доказательство' })
  await selectOptionRobust(page, panel.getByLabel('Инсайт'), insightText)
  await selectOptionRobust(page, panel.getByLabel('Сторона доказательства'), 'Опровергает')
  await panel.getByRole('button', { name: 'Привязать' }).click()

  await expect(page.getByTitle(insightText)).toBeVisible()
  await expect(page.getByText('Против: 1')).toBeVisible()

  // Привязанное больше не предлагается: связь одна на инсайт, и второй раз
  // пикер предлагал бы отобрать её.
  await page.getByRole('button', { name: '+ Добавить доказательство' }).click()
  await expect(
    page.getByRole('group', { name: 'Добавить доказательство' }).getByText(/Свободных инсайтов/)
  ).toBeVisible()
})
