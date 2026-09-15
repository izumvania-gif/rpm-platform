import { expect, test } from '@playwright/test'
import { createProductViaUI, uniqueName } from './helpers'

// Подсказки для неочевидного (фаза 27 плана 2.4).
//
// Два правила, которые нельзя проверить глазами на каждом экране:
// у каждой кнопки без текста есть доступное имя, а подсказка, которая
// открывается по наведению, говорит то же самое; и значок ⓘ открывает
// подсказку с клавиатуры, не только мышью.

/** Кнопки и ссылки, у которых нет видимого текста — только иконка. */
async function iconOnlyControls(page: import('@playwright/test').Page) {
  const controls = page.locator('button:visible, a[href]:visible')
  const count = await controls.count()
  const result: { index: number; name: string }[] = []
  for (let index = 0; index < count; index++) {
    const control = controls.nth(index)
    const text = (await control.innerText()).trim()
    if (text !== '') continue
    const name = (await control.getAttribute('aria-label')) ?? ''
    result.push({ index, name })
  }
  return { controls, result }
}

test('у каждой иконочной кнопки есть имя, и подсказка повторяет его', async ({ page }) => {
  const productName = uniqueName('Tooltip Product')
  await createProductViaUI(page, productName)
  // Карточка продукта — самое густое место иконочных кнопок: закрепить,
  // ссылка, печать, тема в шапке, «+» на карточках модулей, инбокс.
  await page.goto(page.url())

  const { controls, result } = await iconOnlyControls(page)
  expect(result.length).toBeGreaterThan(3)

  for (const { index, name } of result) {
    expect(name, `иконочная кнопка №${index} без доступного имени`).not.toBe('')
    const control = controls.nth(index)
    await control.hover()
    const tooltip = page.getByRole('tooltip').filter({ hasText: name.split(' ')[0] })
    // Не у каждой иконочной кнопки обязана быть подсказка (у «+» есть
    // aria-label с полной фразой), но если она есть — она повторяет имя.
    if ((await tooltip.count()) > 0) {
      await expect(tooltip.first()).toContainText(name)
    }
    // Увести мышь, чтобы следующая подсказка не наложилась на эту.
    await page.mouse.move(0, 0)
  }
})

test('иконочные кнопки карточки записи подсказывают то же, что произносят', async ({ page }) => {
  await createProductViaUI(page, uniqueName('Tooltip Pin Product'))
  const segmentName = uniqueName('Страховые')
  await page.goto('/segments/new')
  await page.getByLabel('Название').fill(segmentName)
  await page.getByRole('button', { name: 'Создать', exact: true }).click()
  await page.waitForURL(/\/segments\/c[a-z0-9]{10,}$/)

  for (const name of ['Закрепить на дашборде', 'Скопировать ссылку']) {
    const button = page.getByRole('button', { name, exact: true })
    await button.hover()
    await expect(page.getByRole('tooltip').filter({ hasText: name })).toBeVisible()
    // Escape закрывает подсказку — как любую всплывающую поверхность.
    await page.keyboard.press('Escape')
    await expect(page.getByRole('tooltip').filter({ hasText: name })).toHaveCount(0)
  }
})

test('значок ⓘ открывает подсказку с клавиатуры', async ({ page }) => {
  await createProductViaUI(page, uniqueName('Tooltip Hint Product'))
  await page.goto('/jtbd/new')

  // Первый значок на форме задачи — у «Категории». Его имя — постоянное
  // «Подсказка», а не текст: иначе `getByLabel('Категория')` находил бы и
  // его (подстрока «категориям»), и поле — см. components/ui/tooltip.tsx.
  const hint = page.getByRole('button', { name: 'Подсказка', exact: true }).first()
  await hint.focus()
  await expect(page.getByRole('tooltip')).toContainText('Свободный текст с автодополнением')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('tooltip')).toHaveCount(0)

  // Доступное имя поля не изменилось: значок стоит рядом с подписью, а не
  // внутри неё.
  await expect(page.getByLabel('Категория', { exact: true })).toBeVisible()
})
