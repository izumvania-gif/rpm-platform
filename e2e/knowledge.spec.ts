import { expect, test } from '@playwright/test'
import { createProductViaUI, selectOptionRobust, uniqueName } from './helpers'

// База знаний как раздел с вкладками и бейджем связи (фаза 11 редизайна 2.1).
//
// До этого исследования, разговоры и инсайты были тремя соседними списками:
// меню их группировало с фазы 6, а сами страницы об этом молчали. И строка в
// каждом из них показывала ровно то, что показала бы таблица в Notion —
// название, продукт, дату, — то есть ничего про связи, на которых стоит вся
// претензия платформы.

test('вкладки водят по трём разделам базы знаний', async ({ page }) => {
  await page.goto('/research')
  const tabs = page.getByRole('navigation', { name: 'Разделы базы знаний' })

  await expect(tabs.getByRole('link', { name: 'Исследования' })).toHaveAttribute(
    'aria-current',
    'page'
  )

  await tabs.getByRole('link', { name: 'Разговоры' }).click()
  await page.waitForURL(/\/conversations$/)
  await expect(tabs.getByRole('link', { name: 'Разговоры' })).toHaveAttribute(
    'aria-current',
    'page'
  )

  await tabs.getByRole('link', { name: 'Инсайты' }).click()
  await page.waitForURL(/\/insights$/)
  await expect(tabs.getByRole('link', { name: 'Инсайты' })).toHaveAttribute('aria-current', 'page')
})

test('строка говорит, с чем запись связана — и когда ни с чем', async ({ page }) => {
  const productName = uniqueName('Knowledge Product')
  await createProductViaUI(page, productName)

  // Разговор без единого инсайта — существующее правило внимания, теперь
  // видное прямо в строке.
  const conversationTitle = uniqueName('Интервью с банком')
  await page.goto('/conversations/new')
  await page.getByLabel('Название').fill(conversationTitle)
  await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), productName)
  await page.getByRole('button', { name: 'Создать', exact: true }).click()
  await page.waitForURL(/\/conversations\/c[a-z0-9]{10,}/)

  await page.goto('/conversations')
  const row = page.locator('tr', { hasText: conversationTitle })
  await expect(row.getByText('инсайты не извлечены')).toBeVisible()

  // Исследование, на которое ничего не ссылается.
  const researchTitle = uniqueName('Опрос по продлению')
  await page.goto('/research/new')
  await page.getByLabel('Название').fill(researchTitle)
  await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), productName)
  await page.getByRole('button', { name: 'Создать', exact: true }).click()
  await page.waitForURL(/\/research\/c[a-z0-9]{10,}/)

  await page.goto('/research')
  await expect(
    page.locator('tr', { hasText: researchTitle }).getByText('ни на что не опирается')
  ).toBeVisible()
})
