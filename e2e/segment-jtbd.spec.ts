import { expect, test } from '@playwright/test'
import { byFullText, createProductViaUI, uniqueName } from './helpers'

// Adding a job from the segment it belongs to.
//
// The segment page showed nothing about its JTBD at all, so the thought "this
// segment also needs X" — which happens exactly while reading the segment —
// cost a trip to /jtbd/new and picking the segment back out of a list.

test('a segment page lists its jobs and adds one already attached', async ({ page }) => {
  const productName = uniqueName('Segment JTBD Product')
  const productUrl = await createProductViaUI(page, productName)
  await page.goto(productUrl)
  const productId = new URL(page.url()).pathname.split('/').pop()!

  const segmentName = uniqueName('Сегмент с задачами')
  await page.getByRole('button', { name: 'Добавить списком' }).click()
  await page.getByRole('textbox').last().fill(segmentName)
  await page.getByRole('button', { name: /^Добавить \(1\)$/ }).click()
  await expect(page.getByRole('status')).toContainText('Добавлено записей: 1')

  await page.reload()
  await page.getByRole('link', { name: segmentName }).click()
  await page.waitForURL(/\/segments\/c[a-z0-9]{10,}/)

  await expect(page.getByText('У сегмента пока нет задач.')).toBeVisible()

  const title = uniqueName('Когда истекает сертификат, я хочу продлить его сам')
  await page.getByLabel('Формулировка JTBD').fill(title)
  // Required by the model and feeding the coverage reports, so it is asked
  // here too rather than filled in on the user's behalf.
  const save = page.getByRole('button', { name: 'Добавить JTBD' })
  await expect(save).toBeDisabled()
  await page.getByLabel('Категория JTBD').fill('Выпуск')
  await expect(save).toBeEnabled()
  await save.click()

  // Appears in place, no navigation.
  await expect(byFullText(page, title)).toBeVisible()
  await expect(page.getByText('У сегмента пока нет задач.')).toHaveCount(0)

  // And it is really attached to this segment, not just to the product —
  // an unattached job is exactly what the gaps report complains about.
  await page.goto(`/reports/segments-jtbd?productId=${productId}`)
  await expect(page.getByRole('cell', { name: segmentName })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Выпуск' })).toBeVisible()
})
