import { expect, test, type Locator, type Page } from '@playwright/test'
import { CHAIN, GROUPS, OVERVIEW } from '../lib/nav-chain'

// Шапка с клавиатуры (фаза 18, plans/2.2-usability-plan.md).
//
// До этой фазы порядок обхода второго ряда по Tab не проверялся ни разу, а
// Escape в подменю ничего не делал. Эти спеки закрепляют то, чего на экране
// не видно и что поэтому молча регрессирует: куда уходит фокус.
//
// Меню читается из lib/nav-chain.ts, а не переписано списком: ожидаемый
// порядок — это и есть модель меню, и второй экземпляр разошёлся бы с ней на
// первой же правке.

const EXPECTED_ORDER = [OVERVIEW, ...CHAIN, ...GROUPS].flatMap((node) => [
  node.href,
  ...(node.children ?? []).map((child) => child.href),
])

// Общая тестовая база может быть пустой в начале прогона, а пустая база даёт
// свёрнутое меню. Порядок обхода — свойство полного меню, поэтому режим
// задаётся явно, тем же ключом, что и nav-disclosure.spec.ts.
async function fullNav(page: Page) {
  await page.addInitScript(() => window.localStorage.setItem('rpm:nav-stage', 'full'))
}

const nav = (page: Page) => page.locator('header nav')

function focusedHref(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement
    return el instanceof HTMLElement ? el.getAttribute('href') : null
  })
}

function focusedLabel(page: Page) {
  return page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? null)
}

// Фокус на пункт с подменю — так, чтобы подменю точно открылось. Ссылки
// отрисованы сервером и получают фокус до гидрации, а обработчик фокуса
// появляется только после неё: фокус «до» React не видит, и подменю не
// откроется (та же гонка dev-режима, что в jtbd-graph.spec.ts). Повторный
// `focus()` на уже сфокусированном элементе события не даёт, поэтому перед
// каждой попыткой фокус снимается.
async function focusParent(page: Page, link: Locator) {
  await untilHydrated(
    async () => {
      await page.evaluate(() => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
      })
      await link.focus()
    },
    () => expect(link).toHaveAttribute('aria-expanded', 'true', { timeout: 500 })
  )
}

// Та же гонка для кнопок: Enter или стрелка до гидрации уходят в пустоту.
// Шаг повторяется, пока не наступит ожидаемое; лишнего эффекта у повтора
// нет, потому что до гидрации нажатие просто не обрабатывается.
async function untilHydrated(step: () => Promise<void>, check: () => Promise<void>) {
  await expect(async () => {
    await step()
    await check()
  }).toPass()
}

test('второй ряд обходится Tab в видимом порядке, подпункты сразу за родителем', async ({
  page,
}) => {
  await fullNav(page)
  await page.goto('/')

  await focusParent(page, nav(page).getByRole('link', { name: 'Обзор' }))
  const seen: (string | null)[] = []
  for (let i = 0; i < EXPECTED_ORDER.length; i++) {
    seen.push(await focusedHref(page))
    await page.keyboard.press('Tab')
  }
  expect(seen).toEqual(EXPECTED_ORDER)

  // За последним подпунктом — переключатель режима меню, а не что-то из
  // подменю, оставшееся открытым.
  expect(['Все разделы', 'Только основное']).toContain(await focusedLabel(page))
})

test('Escape закрывает подменю, возвращает фокус на родителя, Tab идёт дальше', async ({
  page,
}) => {
  await fullNav(page)
  await page.goto('/')

  const overview = nav(page).getByRole('link', { name: 'Обзор' })
  await focusParent(page, overview)

  await page.keyboard.press('Tab')
  expect(await focusedHref(page)).toBe('/products')

  await page.keyboard.press('Escape')
  await expect(overview).toBeFocused()
  await expect(overview).toHaveAttribute('aria-expanded', 'false')

  // Закрытое подменю не ловит фокус: следующая остановка — следующее звено.
  await page.keyboard.press('Tab')
  expect(await focusedHref(page)).toBe('/segments')
})

test('стрелка вниз на родителе открывает подменю и ставит фокус на первый подпункт', async ({
  page,
}) => {
  await fullNav(page)
  await page.goto('/')

  const knowledge = nav(page).getByRole('link', { name: 'База знаний' })
  await focusParent(page, knowledge)
  await page.keyboard.press('Escape')
  await expect(knowledge).toHaveAttribute('aria-expanded', 'false')

  await page.keyboard.press('ArrowDown')
  await expect(knowledge).toHaveAttribute('aria-expanded', 'true')
  expect(await focusedHref(page)).toBe('/research')
})

test('панель «Разделы» возвращает фокус на кнопку при закрытии по Escape', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 })
  await page.goto('/')

  // `exact`: в открытой панели есть кнопка «Все разделы», и нестрогое имя
  // находит обе.
  const button = page.getByRole('button', { name: 'Разделы', exact: true })
  await untilHydrated(
    async () => {
      await button.focus()
      await page.keyboard.press('Enter')
    },
    () => expect(button).toHaveAttribute('aria-expanded', 'true', { timeout: 500 })
  )

  await page.keyboard.press('Tab')
  const panel = page.getByRole('navigation', { name: 'Разделы' })
  await expect(panel.getByRole('link', { name: 'Обзор' })).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(button).toBeFocused()
  await expect(button).toHaveAttribute('aria-expanded', 'false')
})

test('переключатель представлений: стрелки по пунктам, Escape — обратно на кнопку', async ({
  page,
}) => {
  await page.goto('/')

  const button = page.getByRole('button', { name: 'Представления' })
  await untilHydrated(
    async () => {
      await button.focus()
      await page.keyboard.press('ArrowDown')
    },
    () => expect(page.getByRole('menuitem', { name: 'PM' })).toBeFocused({ timeout: 500 })
  )

  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('menuitem', { name: 'CPO' })).toBeFocused()
  await page.keyboard.press('ArrowUp')
  await expect(page.getByRole('menuitem', { name: 'PM' })).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(button).toBeFocused()
  await expect(page.getByRole('menu')).toHaveCount(0)
})

test('окно сокращений берёт фокус, держит его внутри и возвращает кнопке', async ({ page }) => {
  await page.goto('/')

  const trigger = page.getByRole('button', { name: /сокращения/ })
  const dialog = page.getByRole('dialog', { name: 'Клавиатурные сокращения' })
  const close = dialog.getByRole('button', { name: 'Закрыть' })
  await untilHydrated(
    async () => {
      await trigger.focus()
      await page.keyboard.press('Enter')
    },
    () => expect(close).toBeFocused({ timeout: 500 })
  )

  // Единственный фокусируемый элемент — Tab не должен уводить за окно.
  await page.keyboard.press('Tab')
  await expect(close).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('быстрый захват возвращает фокус туда, откуда его вызвали', async ({ page }) => {
  await page.goto('/')

  const inbox = page.getByRole('link', { name: 'Инбокс' })
  const dialog = page.getByRole('dialog', { name: 'Быстрый захват' })
  await untilHydrated(
    async () => {
      await inbox.focus()
      await page.keyboard.press('c')
    },
    () => expect(dialog).toBeVisible({ timeout: 500 })
  )
  await expect(dialog.getByRole('textbox').first()).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(inbox).toBeFocused()
})
