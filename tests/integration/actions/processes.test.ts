import { beforeEach, describe, expect, it } from 'vitest'
import {
  createProcess,
  createProcessQuick,
  deleteProcess,
  updateProcess,
} from '@/lib/actions/processes'
import { prisma } from '@/lib/prisma'
import { buildFormData, captureRedirect, createTestProduct, ensureTestUser } from '../helpers'

beforeEach(ensureTestUser)

describe('createProcess', () => {
  it('creates a process and redirects into its canvas', async () => {
    const product = await createTestProduct()
    const formData = buildFormData({
      title: 'Запуск маркетинговой кампании',
      productId: product.id,
    })

    const redirectPath = await captureRedirect(() => createProcess(formData))
    const process = await prisma.process.findFirst({ where: { productId: product.id } })
    expect(process).toMatchObject({ title: 'Запуск маркетинговой кампании' })
    expect(redirectPath).toBe(`/pm/processes?productId=${product.id}&processId=${process!.id}`)
  })

  it('rejects a missing title', async () => {
    const product = await createTestProduct()
    const formData = buildFormData({ title: '  ', productId: product.id })
    const redirectPath = await captureRedirect(() => createProcess(formData))
    expect(redirectPath).toMatch(/^\/pm\/processes\/new\?productId=.*&error=/)
    expect(await prisma.process.count()).toBe(0)
  })
})

describe('updateProcess / deleteProcess', () => {
  it('renames a process', async () => {
    const product = await createTestProduct()
    const process = await prisma.process.create({ data: { title: 'Old', productId: product.id } })

    const formData = buildFormData({ title: 'New', productId: product.id })
    const redirectPath = await captureRedirect(() => updateProcess(process.id, formData))
    expect(redirectPath).toBe(`/pm/processes?productId=${product.id}&processId=${process.id}`)
    expect((await prisma.process.findUnique({ where: { id: process.id } }))?.title).toBe('New')
  })

  it('deletes a process and cascades its steps', async () => {
    const product = await createTestProduct()
    const process = await prisma.process.create({ data: { title: 'Del', productId: product.id } })
    await prisma.processStep.create({ data: { title: 'Step', x: 0, y: 0, processId: process.id } })

    const redirectPath = await captureRedirect(() => deleteProcess(process.id))
    expect(redirectPath).toBe(`/pm/processes?productId=${product.id}`)
    expect(await prisma.process.findUnique({ where: { id: process.id } })).toBeNull()
    expect(await prisma.processStep.count()).toBe(0)
  })
})

describe('createProcessQuick', () => {
  it('creates a process, no redirect', async () => {
    const product = await createTestProduct()
    const result = await createProcessQuick(product.id, 'Обработка инцидента')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.process).toMatchObject({
      title: 'Обработка инцидента',
      productId: product.id,
    })
  })

  it('rejects a missing title', async () => {
    const product = await createTestProduct()
    const result = await createProcessQuick(product.id, '   ')
    expect(result.ok).toBe(false)
  })
})
