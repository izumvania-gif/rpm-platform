import { expect, test } from '@playwright/test'
import { createProductViaUI, uniqueName } from './helpers'

// Teaching empty states (plans/2.0-product-leap-plan.md, A5) — a module with
// no records should explain what it is for, show a concrete example, and
// offer an action, instead of the old dead-end "Пока нет X." sentence.

test('a fresh product shows teaching empty states with examples and actions on /pm', async ({
  page,
}) => {
  const productName = uniqueName('Empty State Product')
  const productUrl = await createProductViaUI(page, productName)
  const productId = productUrl.split('/').pop()!

  await page.goto(`/pm?productId=${productId}`)

  // Roadmap section: explanation + example + action, not a dead end.
  await expect(page.getByText('Пункт роадмапа — что вы собираетесь сделать')).toBeVisible()
  await expect(page.getByText('Запустить онбординг v2 — 2026 Q4')).toBeVisible()

  // Action plans and process sections teach too.
  await expect(page.getByText('Экшн-план — заранее написанное')).toBeVisible()
  await expect(page.getByText('Крупный клиент публично жалуется')).toBeVisible()
  await expect(page.getByText('Процесс — кто что делает')).toBeVisible()
  await expect(page.getByText('Запуск маркетинговой кампании')).toBeVisible()

  // The old dead-end copy is gone.
  await expect(page.getByText('Пока нет пунктов роадмапа для этого продукта.')).toHaveCount(0)

  // Every teaching block labels its examples.
  expect(await page.getByText('Например', { exact: true }).count()).toBeGreaterThanOrEqual(3)
})

test('the empty-state action opens the matching create form', async ({ page }) => {
  const productName = uniqueName('Empty State Action Product')
  const productUrl = await createProductViaUI(page, productName)
  const productId = productUrl.split('/').pop()!

  await page.goto(`/pm?productId=${productId}`)

  // The roadmap empty state's own CTA (the card header has a same-named
  // inline button, so scope to the dashed teaching block).
  const emptyBlock = page.locator('div.border-dashed', { hasText: 'Пункт роадмапа —' })
  await emptyBlock.getByRole('link', { name: 'Добавить пункт' }).click()
  await page.waitForURL(new RegExp(`/pm/roadmap/new\\?productId=${productId}`))
  await expect(page.getByLabel('Название')).toBeVisible()
})
