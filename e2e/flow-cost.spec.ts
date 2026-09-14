import { expect, test, type Page } from '@playwright/test'
import { byFullText, createProductViaUI, selectRadixOption, uniqueName } from './helpers'

// Цена ежедневных и еженедельных сценариев в переходах между страницами
// (фазы 24–25 плана 2.4).
//
// Замер 14.09: «после звонка» (разговор → инсайт → привязать к задаче) стоил
// 11 переходов, «мысль на ходу» (`c` → инсайт → привязать к сегменту) — 8,
// строка очереди «Пробелов» — 3–4 без дороги назад. Эти спеки — тест-правило
// того же рода, что nav-chain и new-form-return: они считают переходы и
// падают, если сценарий снова уведёт на форму или потеряет дорогу обратно.

/** Переходы главного фрейма; подряд идущие одинаковые адреса — один переход. */
function trackTransitions(page: Page) {
  const paths: string[] = []
  page.on('framenavigated', (frame) => {
    if (frame !== page.mainFrame()) return
    const pathname = new URL(frame.url()).pathname
    if (paths[paths.length - 1] !== pathname) paths.push(pathname)
  })
  return () => paths.length - 1
}

test('после звонка: разговор → инсайт → задача укладывается в два перехода', async ({ page }) => {
  await createProductViaUI(page, uniqueName('Flow Cost Product'))

  // Задача, к которой будет привязан инсайт, — до начала отсчёта.
  await page.goto('/jtbd/new')
  await page
    .getByLabel('Формулировка JTBD')
    .fill(uniqueName('Когда истекает сертификат, я хочу продлить его сам'))
  await page.getByLabel('Категория').fill('Выпуск')
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/jtbd\/c[a-z0-9]{10,}/)

  const transitions = trackTransitions(page)
  await page.goto('/conversations')

  // Разговор — рабочий тип (lib/create-landing.ts): «Создать» ведёт на карточку.
  await page.getByRole('link', { name: 'Новый разговор' }).click()
  await page.waitForURL(/\/conversations\/new$/)
  const quote = uniqueName('Мы не можем ждать неделю выпуска сертификата')
  await page.getByLabel('Название').fill(uniqueName('Звонок'))
  await page.getByLabel('Транскрипт').fill(`Обсудили сроки. «${quote}» — сказал клиент.`)
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/conversations\/c[a-z0-9]{10,}$/)

  // Подсказка → инсайт, и он сразу в списке карточки.
  await page.getByRole('button', { name: 'В инсайты' }).first().click()
  const row = page.locator('li').filter({ has: page.getByTitle(quote) })
  await expect(row).toBeVisible()

  // Задача — прямо в строке, тем же инлайн-селектом, что на карточке инсайта.
  await row.getByRole('button', { name: '+ задача' }).click()
  await row.getByRole('combobox').click()
  await page.getByRole('option', { name: /Продлить его сам/ }).click()
  await expect(row.getByRole('button', { name: /Продлить его сам/ })).toBeVisible()

  expect(transitions()).toBeLessThanOrEqual(2)
})

test('мысль на ходу: захват → карточка → сегмент укладывается в один переход', async ({ page }) => {
  await createProductViaUI(page, uniqueName('Flow Capture Product'))
  const segmentName = uniqueName('Банки')
  await page.goto('/segments/new')
  await page.getByLabel('Название').fill(segmentName)
  await page.getByRole('button', { name: 'Создать', exact: true }).click()
  await page.waitForURL(/\/segments\/c[a-z0-9]{10,}$/)

  const transitions = trackTransitions(page)
  await page.goto('/')
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('c')
  const dialog = page.getByRole('dialog', { name: 'Быстрый захват' })
  const text = uniqueName('Ключи в софте нам не согласует ИБ')
  await dialog.getByRole('textbox').first().fill(text)
  await dialog.getByRole('button', { name: 'Сохранить' }).click()

  // После сохранения — ссылка на запись; связи ставятся уже на её карточке.
  await dialog.getByRole('status').getByRole('link', { name: 'Открыть →' }).click()
  await page.waitForURL(/\/insights\/c[a-z0-9]{10,}$/)
  await expect(page.getByRole('heading', { name: text })).toBeVisible()

  await page.getByRole('button', { name: '+ сегмент' }).click()
  await selectRadixOption(page, page.locator('main').getByRole('combobox').first(), segmentName)
  await expect(page.getByRole('button', { name: segmentName, exact: true })).toBeVisible()

  expect(transitions()).toBeLessThanOrEqual(1)
})

test('очередь пробелов: строка с формой закрывается за два перехода и возвращает в очередь', async ({
  page,
}) => {
  await createProductViaUI(page, uniqueName('Flow Queue Product'))
  const segmentName = uniqueName('Страховые')
  await page.goto('/segments/new')
  await page.getByLabel('Название').fill(segmentName)
  await page.getByRole('button', { name: 'Создать', exact: true }).click()
  await page.waitForURL(/\/segments\/c[a-z0-9]{10,}$/)

  const transitions = trackTransitions(page)
  await page.goto('/reports/gaps')
  const row = page.locator('li').filter({ hasText: segmentName })
  await row.getByRole('link', { name: 'Добавить JTBD' }).click()
  await page.waitForURL(/\/jtbd\/new\?/)
  await page
    .getByLabel('Формулировка JTBD')
    .fill(uniqueName('Когда полис истекает, я хочу продлить его онлайн'))
  await page.getByLabel('Категория').fill('Продление')
  await page.getByRole('button', { name: 'Создать' }).click()

  // Сохранение возвращает в очередь с её областью, а не на карточку задачи —
  // и строки, ради которой уходили, в очереди больше нет.
  await page.waitForURL(/\/reports\/gaps\?productId=/)
  await expect(page.locator('li').filter({ hasText: segmentName })).toHaveCount(0)

  expect(transitions()).toBeLessThanOrEqual(2)
})

test('очередь пробелов: карточка и назад — два перехода, подтвердить из строки — ни одного', async ({
  page,
}) => {
  await createProductViaUI(page, uniqueName('Flow Confirm Product'))
  const researchTitle = uniqueName('Интервью с банками')
  await page.goto('/research/new')
  await page.getByLabel('Название').fill(researchTitle)
  await page.getByRole('button', { name: 'Создать', exact: true }).click()
  await page.waitForURL(/\/research\/c[a-z0-9]{10,}/)
  const jtbdTitle = uniqueName('Когда меняется ключ, я хочу перевыпустить сертификат')
  await page.goto('/jtbd/new')
  await page.getByLabel('Формулировка JTBD').fill(jtbdTitle)
  await page.getByLabel('Категория').fill('Выпуск')
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/jtbd\/c[a-z0-9]{10,}/)

  const transitions = trackTransitions(page)
  await page.goto('/reports/gaps')
  // Строка несёт полный текст в title — ключевая фраза в строке его обрезает.
  const row = () => page.locator('li').filter({ has: byFullText(page, jtbdTitle) })
  await expect(row()).toBeVisible()

  // В карточку и назад: карточка знает, откуда её открыли.
  await row().getByRole('link', { name: 'Открыть' }).click()
  await page.waitForURL(/\/jtbd\/c[a-z0-9]{10,}\?from=/)
  await page.getByRole('link', { name: '← К очереди' }).click()
  await page.waitForURL(/\/reports\/gaps\?productId=/)
  expect(transitions()).toBeLessThanOrEqual(2)

  // Подтвердить — из строки, выбрав исследование: флаг ставится только вместе
  // с ним, и страница при этом никуда не уходит.
  const beforeConfirm = transitions()
  await row().getByRole('button', { name: 'Подтвердить исследованием' }).click()
  const picker = row().getByRole('group', { name: 'Подтвердить исследованием' })
  await picker.getByLabel('Исследование').click()
  await page.getByRole('option', { name: researchTitle }).click()
  await picker.getByRole('button', { name: 'Подтвердить', exact: true }).click()
  await expect(row()).toHaveCount(0)

  expect(transitions()).toBe(beforeConfirm)
})
