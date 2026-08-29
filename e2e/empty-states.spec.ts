import { expect, test } from '@playwright/test'
import { createProductViaUI, uniqueName } from './helpers'

// Teaching empty states (plans/2.0-product-leap-plan.md, A5) — a module with
// no records should explain what it is for, show a concrete example, and
// offer an action, instead of the old dead-end "Пока нет X." sentence.

// С фазы 9 «Доставка» это пять маршрутов, а не одна страница, поэтому и
// проверка идёт по вкладкам: раньше все три пустых состояния лежали одно под
// другим и проверялись одним `goto`.
test('a fresh product shows teaching empty states with examples and actions on /pm', async ({
  page,
}) => {
  const productName = uniqueName('Empty State Product')
  const productUrl = await createProductViaUI(page, productName)
  const productId = productUrl.split('/').pop()!

  await page.goto(`/pm/roadmap?productId=${productId}`)
  // Roadmap tab: explanation + example + action, not a dead end.
  await expect(page.getByText('Пункт роадмапа — что вы собираетесь сделать')).toBeVisible()
  await expect(page.getByText('Запустить онбординг v2 — 2026 Q4')).toBeVisible()
  // The old dead-end copy is gone.
  await expect(page.getByText('Пока нет пунктов роадмапа для этого продукта.')).toHaveCount(0)
  await expect(page.getByText('Например', { exact: true })).toBeVisible()

  await page.getByRole('navigation', { name: 'Разделы доставки' }).getByText('Экшн-планы').click()
  await page.waitForURL(new RegExp(`/pm/action-plans\\?productId=${productId}`))
  await expect(page.getByText('Экшн-план — заранее написанное')).toBeVisible()
  await expect(page.getByText('Крупный клиент публично жалуется')).toBeVisible()

  await page.getByRole('navigation', { name: 'Разделы доставки' }).getByText('Процессы').click()
  await page.waitForURL(new RegExp(`/pm/processes\\?productId=${productId}`))
  await expect(page.getByText('Процесс — кто что делает')).toBeVisible()
  await expect(page.getByText('Запуск маркетинговой кампании')).toBeVisible()
})

test('the empty-state action opens the matching create form', async ({ page }) => {
  const productName = uniqueName('Empty State Action Product')
  const productUrl = await createProductViaUI(page, productName)
  const productId = productUrl.split('/').pop()!

  await page.goto(`/pm/roadmap?productId=${productId}`)

  // The roadmap empty state's own CTA (the card header has a same-named
  // inline button, so scope to the dashed teaching block).
  const emptyBlock = page.locator('div.border-dashed', { hasText: 'Пункт роадмапа —' })
  await emptyBlock.getByRole('link', { name: 'Добавить пункт' }).click()
  await page.waitForURL(new RegExp(`/pm/roadmap/new\\?productId=${productId}`))
  await expect(page.getByLabel('Название')).toBeVisible()
})
