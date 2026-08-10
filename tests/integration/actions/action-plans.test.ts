import { beforeEach, describe, expect, it } from 'vitest'
import {
  createActionPlan,
  createActionPlanQuick,
  deleteActionPlan,
  toggleActionPlanPinned,
  updateActionPlan,
} from '@/lib/actions/action-plans'
import { prisma } from '@/lib/prisma'
import {
  buildFormData,
  captureRedirect,
  createTestProcess,
  createTestProduct,
  ensureTestUser,
} from '../helpers'
import { DEFAULT_USER_ID } from '@/lib/current-user'

beforeEach(ensureTestUser)

describe('createActionPlan', () => {
  it('creates a plan with ordered steps and tags, redirects back to /pm', async () => {
    const product = await createTestProduct()
    const owner = await prisma.person.create({
      data: { name: 'Coordinator', skills: [], userId: DEFAULT_USER_ID },
    })
    const process = await createTestProcess(product.id)
    const step = await prisma.processStep.create({
      data: { title: 'Обсуждение с маркетингом', x: 0, y: 0, processId: process.id },
    })

    const formData = buildFormData({
      scenario: 'Клиент публично жалуется в соцсетях',
      trigger: 'Жалоба набрала 10+ репостов',
      steps: 'Оценить масштаб\nСвязаться с клиентом\nПодготовить ответ',
      tags: 'PR-кризис, срочно',
      productId: product.id,
      ownerId: owner.id,
      processStepId: step.id,
    })

    const redirectPath = await captureRedirect(() => createActionPlan(formData))
    expect(redirectPath).toBe(`/pm?productId=${product.id}&scrollTo=action-plans`)

    const plan = await prisma.actionPlan.findFirst({ where: { productId: product.id } })
    expect(plan).toMatchObject({
      scenario: 'Клиент публично жалуется в соцсетях',
      steps: ['Оценить масштаб', 'Связаться с клиентом', 'Подготовить ответ'],
      tags: ['PR-кризис', 'срочно'],
      ownerId: owner.id,
      processStepId: step.id,
    })
  })

  it('rejects a missing scenario', async () => {
    const product = await createTestProduct()
    const formData = buildFormData({ scenario: '  ', productId: product.id })
    const redirectPath = await captureRedirect(() => createActionPlan(formData))
    expect(redirectPath).toMatch(/^\/pm\/action-plans\/new\?productId=.*&error=/)
    expect(await prisma.actionPlan.count()).toBe(0)
  })
})

describe('updateActionPlan / deleteActionPlan / toggleActionPlanPinned', () => {
  it('updates a plan', async () => {
    const product = await createTestProduct()
    const plan = await prisma.actionPlan.create({
      data: {
        scenario: 'Old',
        steps: [],
        tags: [],
        productId: product.id,
        userId: DEFAULT_USER_ID,
      },
    })

    const formData = buildFormData({ scenario: 'New', productId: product.id })
    const redirectPath = await captureRedirect(() => updateActionPlan(plan.id, formData))
    expect(redirectPath).toBe(`/pm?productId=${product.id}&scrollTo=action-plans`)
    expect((await prisma.actionPlan.findUnique({ where: { id: plan.id } }))?.scenario).toBe('New')
  })

  it('deletes a plan', async () => {
    const product = await createTestProduct()
    const plan = await prisma.actionPlan.create({
      data: {
        scenario: 'Del',
        steps: [],
        tags: [],
        productId: product.id,
        userId: DEFAULT_USER_ID,
      },
    })

    const redirectPath = await captureRedirect(() => deleteActionPlan(plan.id))
    expect(redirectPath).toBe(`/pm?productId=${product.id}&scrollTo=action-plans`)
    expect(await prisma.actionPlan.findUnique({ where: { id: plan.id } })).toBeNull()
  })

  it('toggles pinned', async () => {
    const product = await createTestProduct()
    const plan = await prisma.actionPlan.create({
      data: {
        scenario: 'Pin',
        steps: [],
        tags: [],
        productId: product.id,
        userId: DEFAULT_USER_ID,
      },
    })
    await toggleActionPlanPinned(plan.id, true)
    expect((await prisma.actionPlan.findUnique({ where: { id: plan.id } }))?.pinned).toBe(true)
  })
})

describe('createActionPlanQuick', () => {
  it('creates a plan with steps split into lines, no redirect', async () => {
    const product = await createTestProduct()
    const owner = await prisma.person.create({
      data: { name: 'Quick Coordinator', skills: [], userId: DEFAULT_USER_ID },
    })

    const result = await createActionPlanQuick(
      product.id,
      'Клиент публично жалуется',
      'Жалоба набрала репосты',
      'Оценить масштаб\nСвязаться с клиентом',
      owner.id
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.plan).toMatchObject({
      scenario: 'Клиент публично жалуется',
      trigger: 'Жалоба набрала репосты',
      steps: ['Оценить масштаб', 'Связаться с клиентом'],
      tags: [],
      ownerId: owner.id,
      productId: product.id,
    })
  })

  it('rejects a missing scenario', async () => {
    const product = await createTestProduct()
    const result = await createActionPlanQuick(product.id, '   ', '', '', '')
    expect(result.ok).toBe(false)
  })
})
