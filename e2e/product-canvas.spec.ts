import { expect, test, type Page } from '@playwright/test'
import { createProductViaUI, selectRadixOption, uniqueName } from './helpers'

// The product canvas (plans/2.0-product-leap-plan.md, C2) — direct
// manipulation, so the gestures themselves are what has to be tested.

async function openCanvas(page: Page, label: string) {
  const productName = uniqueName(label)
  const productUrl = await createProductViaUI(page, productName)
  const productId = productUrl.split('/').pop()!
  await page.goto(`/products/${productId}/canvas`)
  await expect(page.getByRole('heading', { name: `Холст: ${productName}` })).toBeVisible()
  return { productId, productName }
}

/**
 * Double-clicks empty canvas, clear of the minimap and the zoom controls.
 *
 * Offsets are spread wide enough that the resulting node cards cannot overlap:
 * an overlapping card covers its neighbour's connection handle, and the drag
 * then grabs the card instead of starting a link.
 */
async function createNodeAt(
  page: Page,
  offset: { x: number; y: number },
  kind: string,
  title: string,
  category?: string
) {
  const pane = page.locator('.react-flow__pane')
  const box = (await pane.boundingBox())!
  await page.mouse.dblclick(box.x + offset.x, box.y + offset.y)
  await expect(page.getByLabel('Название узла')).toBeVisible()

  await selectRadixOption(page, page.getByLabel('Тип узла'), kind)
  await page.getByLabel('Название узла').fill(title)
  if (category) await page.getByLabel('Категория задачи').fill(category)
  await page.getByRole('button', { name: 'Создать' }).click()
  await expect(page.locator('.react-flow__node', { hasText: title })).toBeVisible()
}

/**
 * Drags a connection between two nodes.
 *
 * Aims at the handle elements themselves rather than the node's edge: React
 * Flow renders a handle as a small circle translated half-outside the node
 * box, so a point computed from the node's own bounding box lands next to it,
 * not on it — the drag then starts a pan and no connection is ever attempted.
 */
async function dragConnection(page: Page, fromTitle: string, toTitle: string) {
  const source = page
    .locator('.react-flow__node', { hasText: fromTitle })
    .locator('.react-flow__handle.source')
  const target = page
    .locator('.react-flow__node', { hasText: toTitle })
    .locator('.react-flow__handle.target')

  const from = (await source.boundingBox())!
  const to = (await target.boundingBox())!
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 15 })
  await page.mouse.up()
}

test('a double-click on empty canvas creates a node where it was clicked', async ({ page }) => {
  await openCanvas(page, 'Canvas Create Product')

  const segmentName = uniqueName('Холст Сегмент')
  await createNodeAt(page, { x: 260, y: 200 }, 'Сегмент', segmentName)

  // The record is real, not just a node on screen.
  await page.goto('/segments')
  await expect(page.getByText(segmentName)).toBeVisible()
})

test('a customer job created on the canvas still demands a category', async ({ page }) => {
  await openCanvas(page, 'Canvas Category Product')

  const pane = page.locator('.react-flow__pane')
  const box = (await pane.boundingBox())!
  await page.mouse.dblclick(box.x + 260, box.y + 200)
  await expect(page.getByLabel('Название узла')).toBeVisible()
  await selectRadixOption(page, page.getByLabel('Тип узла'), 'Задача клиента')
  await page.getByLabel('Название узла').fill(uniqueName('Задача без категории'))

  // The category field is part of the JTBD branch specifically — a placeholder
  // category would corrupt the coverage and gaps reports.
  await expect(page.getByLabel('Категория задачи')).toBeVisible()
  await page.getByRole('button', { name: 'Создать' }).click()
  await expect(page.getByText('У задачи клиента нужна категория')).toBeVisible()
})

test('dragging from a segment to a job creates the real link', async ({ page }) => {
  await openCanvas(page, 'Canvas Link Product')

  const segmentName = uniqueName('Связь Сегмент')
  const jobName = uniqueName('Связь Задача')
  await createNodeAt(page, { x: 160, y: 120 }, 'Сегмент', segmentName)
  await createNodeAt(page, { x: 820, y: 420 }, 'Задача клиента', jobName, 'Связи')

  await dragConnection(page, segmentName, jobName)

  await expect(page.locator('.react-flow__edge')).toHaveCount(1)

  // The link is a real relation: the job now lists the segment on its page —
  // both in the chain ribbon at the top and in the segments card below, so
  // this counts links rather than asserting a single unscoped match.
  await page.goto('/jtbd')
  await page.getByText(jobName).click()
  await expect(page.getByRole('link', { name: segmentName }).first()).toBeVisible()
})

test('a link against the chain is refused with an explanation', async ({ page }) => {
  await openCanvas(page, 'Canvas Illegal Product')

  const segmentName = uniqueName('Обратный Сегмент')
  const hypothesisName = uniqueName('Обратная Гипотеза')
  await createNodeAt(page, { x: 160, y: 120 }, 'Сегмент', segmentName)
  await createNodeAt(page, { x: 820, y: 420 }, 'Гипотеза', hypothesisName)

  // Segment straight to hypothesis skips the job in the middle.
  await dragConnection(page, segmentName, hypothesisName)

  await expect(page.getByText('Связь идёт по цепочке: сегмент → задача → гипотеза')).toBeVisible()
  await expect(page.locator('.react-flow__edge')).toHaveCount(0)
})
