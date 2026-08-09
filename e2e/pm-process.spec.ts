import { expect, test } from '@playwright/test'
import { createProductViaUI, uniqueName } from './helpers'

test('create a process, add a step, edit it via the inspector, then delete step and process', async ({
  page,
}) => {
  const productName = uniqueName('Process Product')
  const productUrl = await createProductViaUI(page, productName)
  const productId = productUrl.split('/').pop()!

  await page.goto(`/pm?productId=${productId}`)
  await expect(page.getByRole('heading', { name: 'Процесс' })).toBeVisible()
  await expect(page.getByText('У этого продукта пока нет описанных процессов.')).toBeVisible()

  const processTitle = uniqueName('Запуск маркетинговой кампании')
  await page.getByRole('link', { name: 'Добавить процесс' }).click()
  await page.waitForURL(/\/pm\/processes\/new\?productId=/)
  await page.getByLabel('Название процесса').fill(processTitle)
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/pm\?productId=.+&processId=.+/)

  await expect(page.getByText(`Процесс: ${processTitle}`)).toBeVisible()
  await expect(page.getByText('В этом процессе пока нет шагов.')).toBeVisible()

  const stepTitle = uniqueName('PM планирует кампанию')
  await page.getByRole('button', { name: '+ Добавить шаг' }).click()
  await page.getByPlaceholder('Например: PM планирует кампанию').fill(stepTitle)
  await page.getByRole('button', { name: 'Создать', exact: true }).click()
  await expect(page.getByText(stepTitle)).toBeVisible()

  // Click the node to open the inspector, rename it, save.
  await page.getByText(stepTitle).click()
  const renamed = `${stepTitle} (обновлено)`
  const titleInput = page.getByLabel('Название шага')
  await titleInput.fill(renamed)
  await page.getByRole('button', { name: 'Сохранить' }).click()
  await expect(page.getByText(renamed)).toBeVisible()

  // Re-open the inspector and delete the step. Scoped to the canvas —
  // the "Процесс: ..." header also has its own "Удалить" button (for the
  // process itself), so an unscoped locator here would be ambiguous.
  await page.getByText(renamed).click()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByTestId('rf__wrapper').getByRole('button', { name: 'Удалить' }).click()
  await expect(page.getByText('В этом процессе пока нет шагов.')).toBeVisible()

  // Back to the process list, then delete the process itself.
  await page.getByRole('link', { name: 'Все процессы' }).click()
  await page.waitForURL(new RegExp(`/pm\\?productId=${productId}$`))
  await expect(page.getByText(processTitle)).toBeVisible()

  await page.getByText(processTitle).click()
  await page.waitForURL(/\/pm\?productId=.+&processId=.+/)
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Удалить' }).click()
  await page.waitForURL(new RegExp(`/pm\\?productId=${productId}$`))
  await expect(page.getByText('У этого продукта пока нет описанных процессов.')).toBeVisible()
})

test('create an action plan with ordered steps and tags, then delete it', async ({ page }) => {
  const productName = uniqueName('Action Plan Product')
  const productUrl = await createProductViaUI(page, productName)
  const productId = productUrl.split('/').pop()!

  await page.goto(`/pm?productId=${productId}`)
  await page.getByRole('link', { name: 'Добавить план' }).click()
  await page.waitForURL(/\/pm\/action-plans\/new\?productId=/)

  const scenario = uniqueName('Клиент публично жалуется')
  await page.getByLabel('Сценарий', { exact: true }).fill(scenario)
  await page.getByLabel('Как понять, что сценарий наступил').fill('Жалоба набрала репосты')
  await page
    .getByLabel('Шаги (по одному на строку)')
    .fill('Оценить масштаб\nСвязаться с клиентом\nПодготовить ответ')
  await page.getByLabel('Категории (через запятую)').fill('PR-кризис, срочно')
  await page.getByRole('button', { name: 'Добавить' }).click()
  await page.waitForURL(new RegExp(`/pm\\?productId=${productId}`))

  await expect(page.getByText(scenario)).toBeVisible()
  await expect(page.getByText('Оценить масштаб')).toBeVisible()
  await expect(page.getByText('PR-кризис')).toBeVisible()

  const planRow = page.locator('li', { hasText: scenario })
  page.once('dialog', (dialog) => dialog.accept())
  await planRow.getByRole('button', { name: 'Удалить' }).click()
  await page.waitForURL(new RegExp(`/pm\\?productId=${productId}`))
  await expect(page.getByText(scenario)).toHaveCount(0)
})
