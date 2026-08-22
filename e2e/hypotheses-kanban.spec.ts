import { expect, test } from '@playwright/test'
import { byFullText, createProductViaUI, selectOptionRobust, uniqueName } from './helpers'

test('drag a hypothesis card to a different status column', async ({ page }) => {
  const productName = uniqueName('Kanban Product')
  await createProductViaUI(page, productName)

  const statement = uniqueName('Если упростим онбординг, то вырастет активация')
  await page.goto('/hypotheses/new')
  await page.getByLabel('Формулировка гипотезы').fill(statement)
  await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), productName)
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL('/hypotheses')

  const card = page.locator('[draggable="true"]').filter({ has: byFullText(page, statement) })
  await expect(card).toBeVisible()

  // Both the column <div> and its grid-wrapper ancestor match `has:` — the
  // column itself is the innermost match, i.e. the last one in DOM order.
  const inReviewColumn = page
    .locator('div', { has: page.getByRole('heading', { name: /^На проверке/ }) })
    .last()
  const targetBox = await inReviewColumn.boundingBox()
  if (!targetBox) throw new Error('Could not locate the "На проверке" column')

  const source = await card.boundingBox()
  if (!source) throw new Error('Could not locate the dragged card')

  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2)
  await page.mouse.down()
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 60, { steps: 10 })
  await page.mouse.up()

  // The board optimistically moves the card locally, then persists via
  // updateHypothesisStatus and router.refresh() (components/hypotheses/kanban-board.tsx).
  await expect(inReviewColumn.locator(`[title="${statement}"]`)).toBeVisible()

  await page.goto('/hypotheses')
  const detailLink = byFullText(page, statement)
  await detailLink.click()
  await expect(page.getByText('На проверке').first()).toBeVisible()
})
