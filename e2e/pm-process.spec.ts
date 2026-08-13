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
  await expect(page.getByText('Процесс — кто что делает')).toBeVisible()

  // Inline "Добавить процесс" (plans/2.0-ux-improvement-plan.md, Фаза 5) —
  // no navigation away from /pm.
  const processTitle = uniqueName('Запуск маркетинговой кампании')
  await page.getByRole('button', { name: 'Добавить процесс' }).click()
  await page.getByPlaceholder('Например: Запуск маркетинговой кампании').fill(processTitle)
  await page.getByRole('button', { name: 'Добавить', exact: true }).click()
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
  await page.waitForURL(new RegExp(`/pm\\?productId=${productId}&scrollTo=process$`))
  await expect(page.getByText('Процесс — кто что делает')).toBeVisible()
})

test('create an action plan with ordered steps and tags, then delete it', async ({ page }) => {
  const productName = uniqueName('Action Plan Product')
  const productUrl = await createProductViaUI(page, productName)
  const productId = productUrl.split('/').pop()!

  await page.goto(`/pm?productId=${productId}`)

  // Inline "Добавить план" (plans/2.0-ux-improvement-plan.md, Фаза 5) — no
  // navigation away from /pm. Tags stay on the full form (reachable via
  // "Больше полей →" or "Редактировать" afterward), so this only exercises
  // scenario/trigger/steps.
  const scenario = uniqueName('Клиент публично жалуется')
  await page.getByRole('button', { name: 'Добавить план' }).click()
  await page.getByPlaceholder('Сценарий, напр. Клиент публично жалуется в соцсетях').fill(scenario)
  await page
    .getByPlaceholder('Как понять, что сценарий наступил (необязательно)')
    .fill('Жалоба набрала репосты')
  await page
    .getByPlaceholder('Шаги, по одному на строку')
    .fill('Оценить масштаб\nСвязаться с клиентом\nПодготовить ответ')
  await page.getByRole('button', { name: 'Добавить', exact: true }).click()

  await expect(page.getByText(scenario)).toBeVisible()
  await expect(page.getByText('Оценить масштаб')).toBeVisible()

  const planRow = page.locator('li', { hasText: scenario })
  page.once('dialog', (dialog) => dialog.accept())
  await planRow.getByRole('button', { name: 'Удалить' }).click()
  await page.waitForURL(new RegExp(`/pm\\?productId=${productId}`))
  await expect(page.getByText(scenario)).toHaveCount(0)
})
