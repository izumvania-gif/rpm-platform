import { expect, test } from '@playwright/test'

// A required Select must be able to complain.
//
// The Radix Select mirrors its value into a real <select> so FormData-based
// Server Action submission keeps working. That mirror used to carry `hidden`,
// which made the form unsubmittable while `required` and empty *and* left the
// browser unable to report why: it logs "An invalid form control with
// name='productId' is not focusable" and stops. Every create form reached
// without a productId in the URL — which is every «Новый …» button on every
// list page — therefore had a primary button that did nothing at all, with no
// message anywhere on the page.

test('a create form with no product chosen reports instead of doing nothing', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })

  // Форма подставляет активный продукт из cookie (фаза 4 редизайна 2.1),
  // поэтому пустое обязательное поле теперь достижимо только без неё. Это
  // само по себе улучшение — в обычной работе продукт почти всегда подставлен,
  // — но проверяемая тут защита никуда не делась: у нового пользователя, у
  // которого продукт ещё не выбран, форма обязана сказать, чего ей не хватает.
  await page.context().clearCookies({ name: 'rpm_active_product' })

  // No ?productId= — the state every list page's «Новый JTBD» lands in.
  await page.goto('/jtbd/new')
  await page.getByLabel('Формулировка JTBD').fill('Когда падает сервис, я хочу узнать первым')
  await page.getByLabel('Категория').fill('Наблюдаемость')
  await page.getByRole('button', { name: 'Создать' }).click()

  // Still on the form — the submission really is blocked, as it should be.
  await expect(page).toHaveURL(/\/jtbd\/new/)

  // But now the browser can say so: it focuses the offending control and
  // carries a message, rather than failing silently.
  const state = await page.evaluate(() => {
    const select = document.querySelector<HTMLSelectElement>('select[name="productId"]')
    return {
      focused: document.activeElement?.getAttribute('name'),
      message: select?.validationMessage,
      hidden: select?.hidden,
    }
  })
  expect(state.hidden).toBe(false)
  expect(state.focused).toBe('productId')
  // In Russian, not whatever locale the browser happens to run in.
  expect(state.message).toBe('Выберите значение из списка')
  expect(errors.join('\n')).not.toContain('is not focusable')
})

test('choosing a product clears the custom message and lets the form submit', async ({ page }) => {
  // setCustomValidity with a non-empty string keeps a control invalid until
  // it is cleared, so forgetting to clear it would break every form instead.
  await page.goto('/jtbd/new')
  await page.getByLabel('Формулировка JTBD').fill('Когда истекает срок, я хочу узнать заранее')
  await page.getByLabel('Категория').fill('Наблюдаемость')

  await page.getByLabel('Продукт', { exact: true }).click()
  await page.getByRole('option').nth(1).click()

  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/jtbd\/c[a-z0-9]{10,}/)
})
