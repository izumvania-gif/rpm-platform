import { beforeEach, describe, expect, it } from 'vitest'
import { importRowsQuick } from '@/lib/actions/import'
import { applyStarterTemplate } from '@/lib/actions/templates'
import { prisma } from '@/lib/prisma'
import { createTestProduct, ensureTestUser } from '../helpers'
import { starterTemplates } from '@/lib/starter-templates'

beforeEach(ensureTestUser)

describe('importRowsQuick', () => {
  it('imports competitors with optional columns', async () => {
    const product = await createTestProduct()
    const result = await importRowsQuick('competitor', product.id, [
      { name: 'КриптоПро', url: 'https://cryptopro.ru', positioning: 'СКЗИ' },
      { name: 'Аладдин Р.Д.' },
    ])
    expect(result).toEqual({ ok: true, created: 2 })

    const rows = await prisma.competitor.findMany({
      where: { productId: product.id },
      orderBy: { name: 'asc' },
    })
    expect(rows[0]).toMatchObject({ name: 'Аладдин Р.Д.', url: null, positioning: null })
    expect(rows[1]).toMatchObject({
      name: 'КриптоПро',
      url: 'https://cryptopro.ru',
      positioning: 'СКЗИ',
    })
  })

  it('splits a tags cell and parses a decimal comma into audienceShare', async () => {
    const product = await createTestProduct()
    await importRowsQuick('segment', product.id, [
      { name: 'Банки топ-30', tags: 'финансы; регулятор', audienceShare: '12,5' },
    ])
    const segment = await prisma.segment.findFirst({ where: { productId: product.id } })
    expect(segment?.tags).toEqual(['финансы', 'регулятор'])
    expect(segment?.audienceShare).toBe(12.5)
  })

  it('rounds a fractional priority for the Int column', async () => {
    const product = await createTestProduct()
    await importRowsQuick('hypothesis', product.id, [{ statement: 'Гипотеза', priority: '2,6' }])
    const row = await prisma.hypothesis.findFirst({ where: { productId: product.id } })
    expect(row?.priority).toBe(3)
    expect(row?.status).toBe('DRAFT')
  })

  it('skips rows whose required field is blank', async () => {
    const product = await createTestProduct()
    const result = await importRowsQuick('segment', product.id, [
      { name: 'Банки' },
      { name: '  ' },
      { name: 'СМБ' },
    ])
    expect(result).toEqual({ ok: true, created: 2 })
  })

  it('rejects rows with no usable required value at all', async () => {
    const product = await createTestProduct()
    const result = await importRowsQuick('segment', product.id, [{ name: '' }])
    expect(result.ok).toBe(false)
    expect(await prisma.segment.count()).toBe(0)
  })

  it('refuses to write into another user’s product', async () => {
    const otherUser = await prisma.user.create({
      data: { email: `other-import-${Date.now()}@example.com`, passwordHash: 'x' },
    })
    const foreign = await prisma.product.create({
      data: { name: 'Foreign', slug: `foreign-import-${Date.now()}`, userId: otherUser.id },
    })
    const result = await importRowsQuick('segment', foreign.id, [{ name: 'Банки' }])
    expect(result).toEqual({ ok: false, error: 'Продукт не найден' })
    expect(await prisma.segment.count({ where: { productId: foreign.id } })).toBe(0)
  })
})

describe('applyStarterTemplate', () => {
  it('creates segments, JTBD and hypotheses, already linked', async () => {
    const product = await createTestProduct()
    const template = starterTemplates[0]

    const result = await applyStarterTemplate(product.id, template.key)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.segments).toBe(template.segments.length)
    expect(result.jtbds).toBe(template.jtbds.length)
    expect(result.hypotheses).toBe(template.hypotheses.length)

    // JTBD arrive linked to their segments, which is the point of a skeleton.
    const jtbds = await prisma.jTBD.findMany({
      where: { productId: product.id },
      include: { segments: true },
    })
    expect(jtbds.some((j) => j.segments.length > 0)).toBe(true)
  })

  it('leaves everything unconfirmed so it still walks the confirmation path', async () => {
    const product = await createTestProduct()
    await applyStarterTemplate(product.id, starterTemplates[0].key)

    const jtbds = await prisma.jTBD.findMany({ where: { productId: product.id } })
    expect(jtbds.every((j) => j.confirmed === false)).toBe(true)
    const hypotheses = await prisma.hypothesis.findMany({ where: { productId: product.id } })
    expect(hypotheses.every((h) => h.status === 'DRAFT')).toBe(true)
  })

  it('appends without duplicating a segment that already exists by name', async () => {
    const product = await createTestProduct()
    const template = starterTemplates[0]
    await applyStarterTemplate(product.id, template.key)
    await applyStarterTemplate(product.id, template.key)

    const segments = await prisma.segment.findMany({ where: { productId: product.id } })
    expect(segments).toHaveLength(template.segments.length)
    // JTBD and hypotheses are appended, not deduped — only segments are keyed
    // by name because JTBD link to them.
    expect(await prisma.jTBD.count({ where: { productId: product.id } })).toBe(
      template.jtbds.length * 2
    )
  })

  it('rejects an unknown template key', async () => {
    const product = await createTestProduct()
    expect(await applyStarterTemplate(product.id, 'nope')).toEqual({
      ok: false,
      error: 'Шаблон не найден',
    })
  })

  it('refuses to apply into another user’s product', async () => {
    const otherUser = await prisma.user.create({
      data: { email: `other-tpl-${Date.now()}@example.com`, passwordHash: 'x' },
    })
    const foreign = await prisma.product.create({
      data: { name: 'Foreign', slug: `foreign-tpl-${Date.now()}`, userId: otherUser.id },
    })
    const result = await applyStarterTemplate(foreign.id, starterTemplates[0].key)
    expect(result).toEqual({ ok: false, error: 'Продукт не найден' })
    expect(await prisma.segment.count({ where: { productId: foreign.id } })).toBe(0)
  })
})
