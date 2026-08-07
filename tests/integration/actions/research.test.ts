import { beforeEach, describe, expect, it } from 'vitest'
import {
  createResearch,
  createResearchQuick,
  deleteResearch,
  toggleResearchPinned,
  updateResearch,
  updateResearchField,
} from '@/lib/actions/research'
import { prisma } from '@/lib/prisma'
import { buildFormData, captureRedirect, createTestProduct, ensureTestUser } from '../helpers'

beforeEach(ensureTestUser)

describe('createResearch', () => {
  it('creates a research entry with tags and assigns a sequential number', async () => {
    const product = await createTestProduct()
    const formData = buildFormData({
      title: 'Usability test #1',
      date: '2026-01-10',
      status: 'IN_PROGRESS',
      type: 'USABILITY_TESTING',
      tags: 'ux, onboarding',
      productId: product.id,
    })

    const redirectPath = await captureRedirect(() => createResearch(formData))
    const id = redirectPath.split('/').pop()!
    const research = await prisma.research.findUnique({ where: { id } })
    expect(research).toMatchObject({ title: 'Usability test #1', tags: ['ux', 'onboarding'] })
    expect(research?.number).toBeGreaterThan(0)
  })

  it('rejects a missing title', async () => {
    const product = await createTestProduct()
    const formData = buildFormData({
      title: '',
      date: '2026-01-10',
      status: 'IN_PROGRESS',
      type: 'MANUAL',
      productId: product.id,
    })
    const redirectPath = await captureRedirect(() => createResearch(formData))
    expect(redirectPath).toMatch(/^\/research\/new\?error=/)
  })
})

describe('updateResearch / deleteResearch / toggleResearchPinned', () => {
  it('updates a research entry', async () => {
    const product = await createTestProduct()
    const research = await prisma.research.create({
      data: {
        title: 'Old',
        date: new Date('2026-01-01'),
        type: 'MANUAL',
        productId: product.id,
        userId: product.userId,
      },
    })

    const formData = buildFormData({
      title: 'New',
      date: '2026-02-01',
      status: 'COMPLETED',
      type: 'SURVEY',
      productId: product.id,
    })
    const redirectPath = await captureRedirect(() => updateResearch(research.id, formData))
    expect(redirectPath).toBe(`/research/${research.id}`)
    expect((await prisma.research.findUnique({ where: { id: research.id } }))?.status).toBe(
      'COMPLETED'
    )
  })

  it('deletes a research entry', async () => {
    const product = await createTestProduct()
    const research = await prisma.research.create({
      data: {
        title: 'Delete me',
        date: new Date(),
        type: 'MANUAL',
        productId: product.id,
        userId: product.userId,
      },
    })
    const redirectPath = await captureRedirect(() => deleteResearch(research.id))
    expect(redirectPath).toBe('/research')
    expect(await prisma.research.findUnique({ where: { id: research.id } })).toBeNull()
  })

  it('toggles pinned', async () => {
    const product = await createTestProduct()
    const research = await prisma.research.create({
      data: {
        title: 'Pin me',
        date: new Date(),
        type: 'MANUAL',
        productId: product.id,
        userId: product.userId,
      },
    })
    await toggleResearchPinned(research.id, true)
    expect((await prisma.research.findUnique({ where: { id: research.id } }))?.pinned).toBe(true)
  })
})

describe('createResearchQuick', () => {
  it('creates a research entry without a form', async () => {
    const product = await createTestProduct()
    const result = await createResearchQuick(product.id, 'Quick research', 'DESK_RESEARCH')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.research.status).toBe('IN_PROGRESS')
    }
  })

  it('rejects a missing title', async () => {
    const product = await createTestProduct()
    const result = await createResearchQuick(product.id, '   ', 'MANUAL')
    expect(result.ok).toBe(false)
  })
})

describe('updateResearchField', () => {
  it('updates the date field inline', async () => {
    const product = await createTestProduct()
    const research = await prisma.research.create({
      data: {
        title: 'Inline',
        date: new Date('2026-01-01'),
        type: 'MANUAL',
        productId: product.id,
        userId: product.userId,
      },
    })
    const result = await updateResearchField(research.id, 'date', '2026-03-15')
    expect(result).toEqual({ ok: true })
  })

  it('rejects an invalid date', async () => {
    const product = await createTestProduct()
    const research = await prisma.research.create({
      data: {
        title: 'Inline',
        date: new Date('2026-01-01'),
        type: 'MANUAL',
        productId: product.id,
        userId: product.userId,
      },
    })
    const result = await updateResearchField(research.id, 'date', 'not-a-date')
    expect(result.ok).toBe(false)
  })
})
