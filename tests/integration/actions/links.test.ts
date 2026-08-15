import { beforeEach, describe, expect, it } from 'vitest'
import { setLink } from '@/lib/actions/links'
import { prisma } from '@/lib/prisma'
import { createTestProduct, ensureTestUser } from '../helpers'
import { DEFAULT_USER_ID } from '@/lib/current-user'
import { NOT_OWNED_ERROR } from '@/lib/ownership'

beforeEach(ensureTestUser)

async function otherUser() {
  return prisma.user.create({
    data: {
      email: `other-links-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`,
      passwordHash: 'x',
    },
  })
}

async function seedChain() {
  const product = await createTestProduct()
  const [segment, jtbd, feature, rtb] = await Promise.all([
    prisma.segment.create({
      data: { name: 'Банки', slug: 'banki', productId: product.id, userId: DEFAULT_USER_ID },
    }),
    prisma.jTBD.create({
      data: {
        title: 'Продлить сертификат',
        category: 'Выпуск',
        productId: product.id,
        userId: DEFAULT_USER_ID,
      },
    }),
    prisma.feature.create({
      data: { name: 'Удалённый выпуск', productId: product.id, userId: DEFAULT_USER_ID },
    }),
    prisma.rTB.create({
      data: { statement: 'Выпуск за 15 минут', productId: product.id, userId: DEFAULT_USER_ID },
    }),
  ])
  return { product, segment, jtbd, feature, rtb }
}

describe('setLink', () => {
  it('connects and disconnects a JTBD and a segment', async () => {
    const { segment, jtbd } = await seedChain()

    expect(await setLink('segment-jtbd', jtbd.id, segment.id, true)).toEqual({ ok: true })
    const linked = await prisma.jTBD.findUnique({
      where: { id: jtbd.id },
      select: { segments: { select: { id: true } } },
    })
    expect(linked?.segments.map((s) => s.id)).toEqual([segment.id])

    expect(await setLink('segment-jtbd', jtbd.id, segment.id, false)).toEqual({ ok: true })
    const unlinked = await prisma.jTBD.findUnique({
      where: { id: jtbd.id },
      select: { segments: { select: { id: true } } },
    })
    expect(unlinked?.segments).toEqual([])
  })

  it('connects a feature to a JTBD', async () => {
    const { jtbd, feature } = await seedChain()
    expect(await setLink('jtbd-feature', feature.id, jtbd.id, true)).toEqual({ ok: true })
    const linked = await prisma.feature.findUnique({
      where: { id: feature.id },
      select: { jtbds: { select: { id: true } } },
    })
    expect(linked?.jtbds.map((j) => j.id)).toEqual([jtbd.id])
  })

  it('connects a feature to an RTB', async () => {
    const { feature, rtb } = await seedChain()
    expect(await setLink('feature-rtb', feature.id, rtb.id, true)).toEqual({ ok: true })
    const linked = await prisma.rTB.findUnique({
      where: { id: rtb.id },
      select: { features: { select: { id: true } } },
    })
    expect(linked?.features.map((f) => f.id)).toEqual([feature.id])
  })

  it('is idempotent — connecting twice leaves one link, not a duplicate', async () => {
    const { segment, jtbd } = await seedChain()
    // The client holds optimistic state, so a double click or a stale tab can
    // send the same connect twice.
    await setLink('segment-jtbd', jtbd.id, segment.id, true)
    await setLink('segment-jtbd', jtbd.id, segment.id, true)
    const linked = await prisma.jTBD.findUnique({
      where: { id: jtbd.id },
      select: { segments: { select: { id: true } } },
    })
    expect(linked?.segments).toHaveLength(1)
  })

  it('tolerates disconnecting a link that is not there', async () => {
    const { segment, jtbd } = await seedChain()
    expect(await setLink('segment-jtbd', jtbd.id, segment.id, false)).toEqual({ ok: true })
  })

  it('refuses a row belonging to another tenant', async () => {
    const { segment } = await seedChain()
    const other = await otherUser()
    const otherProduct = await prisma.product.create({
      data: { name: 'Чужой', slug: 'chuzhoy-links', userId: other.id },
    })
    const otherJtbd = await prisma.jTBD.create({
      data: {
        title: 'Чужая задача',
        category: 'Чужая',
        productId: otherProduct.id,
        userId: other.id,
      },
    })

    expect(await setLink('segment-jtbd', otherJtbd.id, segment.id, true)).toEqual({
      ok: false,
      error: NOT_OWNED_ERROR,
    })
  })

  it('refuses a column belonging to another tenant', async () => {
    const { jtbd } = await seedChain()
    const other = await otherUser()
    const otherProduct = await prisma.product.create({
      data: { name: 'Чужой 2', slug: 'chuzhoy-links-2', userId: other.id },
    })
    const otherSegment = await prisma.segment.create({
      data: {
        name: 'Чужой сегмент',
        slug: 'chuzhoy-seg',
        productId: otherProduct.id,
        userId: other.id,
      },
    })

    // The row is ours, so guarding only the row would let this write through
    // and attach somebody else's segment to our JTBD.
    expect(await setLink('segment-jtbd', jtbd.id, otherSegment.id, true)).toEqual({
      ok: false,
      error: NOT_OWNED_ERROR,
    })
    const linked = await prisma.jTBD.findUnique({
      where: { id: jtbd.id },
      select: { segments: { select: { id: true } } },
    })
    expect(linked?.segments).toEqual([])
  })
})
