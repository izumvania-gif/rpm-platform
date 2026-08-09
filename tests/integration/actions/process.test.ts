import { beforeEach, describe, expect, it } from 'vitest'
import {
  createProcessEdge,
  createProcessStepQuick,
  deleteProcessEdge,
  deleteProcessStep,
  saveProcessStepPositions,
  updateProcessStep,
} from '@/lib/actions/process'
import { prisma } from '@/lib/prisma'
import { createTestProcess, createTestProduct, ensureTestUser } from '../helpers'
import { DEFAULT_USER_ID } from '@/lib/current-user'

beforeEach(ensureTestUser)

describe('createProcessStepQuick', () => {
  it('creates a step at the given position', async () => {
    const product = await createTestProduct()
    const process = await createTestProcess(product.id)
    const result = await createProcessStepQuick(process.id, 'PM планирует кампанию', 80, 80)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.step).toMatchObject({ title: 'PM планирует кампанию', x: 80, y: 80 })
  })

  it('rejects a missing title', async () => {
    const product = await createTestProduct()
    const process = await createTestProcess(product.id)
    const result = await createProcessStepQuick(process.id, '   ', 0, 0)
    expect(result.ok).toBe(false)
  })
})

describe('updateProcessStep / deleteProcessStep', () => {
  it('updates title and assigned person', async () => {
    const product = await createTestProduct()
    const process = await createTestProcess(product.id)
    const person = await prisma.person.create({
      data: { name: 'Owner', skills: [], userId: DEFAULT_USER_ID },
    })
    const step = await prisma.processStep.create({
      data: { title: 'Old', x: 0, y: 0, processId: process.id },
    })

    const result = await updateProcessStep(step.id, { title: 'New', assignedPersonId: person.id })
    expect(result).toEqual({ ok: true })
    const updated = await prisma.processStep.findUnique({ where: { id: step.id } })
    expect(updated).toMatchObject({ title: 'New', assignedPersonId: person.id })
  })

  it('rejects an empty title', async () => {
    const product = await createTestProduct()
    const process = await createTestProcess(product.id)
    const step = await prisma.processStep.create({
      data: { title: 'Old', x: 0, y: 0, processId: process.id },
    })
    const result = await updateProcessStep(step.id, { title: '  ', assignedPersonId: null })
    expect(result.ok).toBe(false)
  })

  it('deletes a step and cascades its edges', async () => {
    const product = await createTestProduct()
    const process = await createTestProcess(product.id)
    const a = await prisma.processStep.create({
      data: { title: 'A', x: 0, y: 0, processId: process.id },
    })
    const b = await prisma.processStep.create({
      data: { title: 'B', x: 100, y: 0, processId: process.id },
    })
    await prisma.processEdge.create({ data: { fromStepId: a.id, toStepId: b.id } })

    await deleteProcessStep(a.id)
    expect(await prisma.processStep.findUnique({ where: { id: a.id } })).toBeNull()
    expect(await prisma.processEdge.count()).toBe(0)
  })
})

describe('saveProcessStepPositions', () => {
  it('batch-updates positions', async () => {
    const product = await createTestProduct()
    const process = await createTestProcess(product.id)
    const a = await prisma.processStep.create({
      data: { title: 'A', x: 0, y: 0, processId: process.id },
    })
    const b = await prisma.processStep.create({
      data: { title: 'B', x: 0, y: 0, processId: process.id },
    })

    await saveProcessStepPositions([
      { stepId: a.id, x: 50, y: 60 },
      { stepId: b.id, x: 150, y: 160 },
    ])

    expect(await prisma.processStep.findUnique({ where: { id: a.id } })).toMatchObject({
      x: 50,
      y: 60,
    })
    expect(await prisma.processStep.findUnique({ where: { id: b.id } })).toMatchObject({
      x: 150,
      y: 160,
    })
  })

  it('is a no-op for an empty list', async () => {
    await expect(saveProcessStepPositions([])).resolves.toBeUndefined()
  })
})

describe('createProcessEdge / deleteProcessEdge', () => {
  it('creates an edge with an optional label', async () => {
    const product = await createTestProduct()
    const process = await createTestProcess(product.id)
    const a = await prisma.processStep.create({
      data: { title: 'A', x: 0, y: 0, processId: process.id },
    })
    const b = await prisma.processStep.create({
      data: { title: 'B', x: 100, y: 0, processId: process.id },
    })

    const result = await createProcessEdge(a.id, b.id, 'передаёт в')
    expect(result).toEqual({ ok: true })
    const edge = await prisma.processEdge.findFirst({ where: { fromStepId: a.id, toStepId: b.id } })
    expect(edge?.label).toBe('передаёт в')
  })

  it('rejects a self-loop', async () => {
    const product = await createTestProduct()
    const process = await createTestProcess(product.id)
    const a = await prisma.processStep.create({
      data: { title: 'A', x: 0, y: 0, processId: process.id },
    })
    const result = await createProcessEdge(a.id, a.id)
    expect(result.ok).toBe(false)
  })

  it('rejects a duplicate edge', async () => {
    const product = await createTestProduct()
    const process = await createTestProcess(product.id)
    const a = await prisma.processStep.create({
      data: { title: 'A', x: 0, y: 0, processId: process.id },
    })
    const b = await prisma.processStep.create({
      data: { title: 'B', x: 100, y: 0, processId: process.id },
    })
    await prisma.processEdge.create({ data: { fromStepId: a.id, toStepId: b.id } })

    const result = await createProcessEdge(a.id, b.id)
    expect(result.ok).toBe(false)
  })

  it('deletes an edge', async () => {
    const product = await createTestProduct()
    const process = await createTestProcess(product.id)
    const a = await prisma.processStep.create({
      data: { title: 'A', x: 0, y: 0, processId: process.id },
    })
    const b = await prisma.processStep.create({
      data: { title: 'B', x: 100, y: 0, processId: process.id },
    })
    const edge = await prisma.processEdge.create({ data: { fromStepId: a.id, toStepId: b.id } })

    await deleteProcessEdge(edge.id)
    expect(await prisma.processEdge.findUnique({ where: { id: edge.id } })).toBeNull()
  })
})
