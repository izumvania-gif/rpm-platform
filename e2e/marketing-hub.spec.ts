import { expect, test } from '@playwright/test'
import { createProductViaUI, selectOptionRobust, uniqueName } from './helpers'

test('shows the JTBD -> feature -> RTB chain for a segment, and upcoming roadmap items', async ({
  page,
}) => {
  const productName = uniqueName('Marketing Hub Product')
  const productUrl = await createProductViaUI(page, productName)
  const productId = productUrl.split('/').pop()!

  const segmentName = uniqueName('Enterprise')
  await page.goto('/segments/new')
  await page.getByLabel('Название').fill(segmentName)
  await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), productName)
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/segments\/(?!new)[^/]+$/)

  const jtbdTitle = uniqueName('Onboard a new admin')
  await page.goto('/jtbd/new')
  await page.getByLabel('Формулировка JTBD').fill(jtbdTitle)
  await page.getByLabel('Категория').fill('Onboarding')
  await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), productName)
  await page.getByLabel(segmentName).check()
  await page.getByLabel('Подтверждено исследованием').check()
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/jtbd\/(?!new)[^/]+$/)

  const featureName = uniqueName('SSO login')
  await page.goto('/features/new')
  await page.getByLabel('Название').fill(featureName)
  await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), productName)
  await page.getByLabel(jtbdTitle).check()
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/features\/(?!new)[^/]+$/)

  const rtbStatement = uniqueName('Enterprise-grade security certified')
  await page.goto('/marketing/new')
  await page.getByLabel('Формулировка обещания').fill(rtbStatement)
  await selectOptionRobust(page, page.getByLabel('Продукт', { exact: true }), productName)
  await page.getByLabel(featureName).check()
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.waitForURL(/\/marketing\/(?!new)[^/]+$/)

  const roadmapItemTitle = uniqueName('SAML support')
  await page.goto(`/pm/roadmap/new?productId=${productId}`)
  await page.getByLabel('Название').fill(roadmapItemTitle)
  await page.getByRole('button', { name: 'Добавить' }).click()
  await page.waitForURL(new RegExp(`/pm\\?productId=${productId}`))

  await page.goto('/marketing-hub')
  await selectOptionRobust(page, page.getByLabel('Сегмент'), segmentName)

  await expect(
    page.getByRole('heading', { name: `Что можно сказать сегменту «${segmentName}»` })
  ).toBeVisible()
  await expect(page.getByText(jtbdTitle)).toBeVisible()
  await expect(page.getByText('Подтверждён')).toBeVisible()
  await expect(page.getByText(featureName)).toBeVisible()
  await expect(page.getByText(rtbStatement)).toBeVisible()
  await expect(page.getByText(roadmapItemTitle)).toBeVisible()
})
