import { beforeEach, describe, expect, it } from 'vitest'
import { chainCandidates, fillChainGap } from '@/lib/actions/chain-link'
import { prisma } from '@/lib/prisma'
import { createTestProduct, ensureTestUser } from '../helpers'
import { DEFAULT_USER_ID } from '@/lib/current-user'
import { NOT_OWNED_ERROR } from '@/lib/ownership'

beforeEach(ensureTestUser)

async function otherUser() {
  return prisma.user.create({
    data: {
      email: `other-chain-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`,
      passwordHash: 'x',
    },
  })
}

async function seedChain() {
  const product = await createTestProduct()
  const [segment, jtbd, feature, rtb, hypothesis] = await Promise.all([
    prisma.segment.create({
      data: { name: 'Банки', slug: 'banki', productId: product.id, userId: DEFAULT_USER_ID },
    }),
    prisma.jTBD.create({
      data: {
        title: 'Когда истекает сертификат, я хочу продлить его, чтобы не встать',
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
    prisma.hypothesis.create({
      data: {
        statement: 'Если выпускать удалённо, банки согласятся на пилот',
        productId: product.id,
        userId: DEFAULT_USER_ID,
      },
    }),
  ])
  return { product, segment, jtbd, feature, rtb, hypothesis }
}

describe('chainCandidates', () => {
  it('offers what is not linked yet', async () => {
    const { jtbd, segment } = await seedChain()

    const before = await chainCandidates('jtbd-segment', jtbd.id)
    expect(before.ok && before.candidates.map((c) => c.id)).toEqual([segment.id])

    await fillChainGap('jtbd-segment', jtbd.id, segment.id)

    // Уже связанное исчезает: пикер не должен предлагать действие, которое
    // ничего не изменит.
    const after = await chainCandidates('jtbd-segment', jtbd.id)
    expect(after.ok && after.candidates).toEqual([])
  })

  it('stays inside the product', async () => {
    const { jtbd } = await seedChain()
    const otherProduct = await prisma.product.create({
      data: { name: 'Второй продукт', slug: 'vtoroy-chain', userId: DEFAULT_USER_ID },
    })
    await prisma.segment.create({
      data: {
        name: 'Сегмент другого продукта',
        slug: 'drugoy-chain',
        productId: otherProduct.id,
        userId: DEFAULT_USER_ID,
      },
    })

    // Тот же арендатор, другой продукт. Связь между продуктами не считает ни
    // один отчёт — предлагать её значит предлагать бессмыслицу.
    const result = await chainCandidates('jtbd-segment', jtbd.id)
    expect(result.ok && result.candidates.map((c) => c.label)).toEqual(['Банки'])
  })

  it('never offers a hypothesis that already belongs to another job', async () => {
    const { product, jtbd, hypothesis } = await seedChain()
    const otherJtbd = await prisma.jTBD.create({
      data: {
        title: 'Вторая задача',
        category: 'Выпуск',
        productId: product.id,
        userId: DEFAULT_USER_ID,
      },
    })
    await prisma.hypothesis.update({
      where: { id: hypothesis.id },
      data: { jtbdId: otherJtbd.id },
    })

    // Hypothesis.jtbdId одна на запись, поэтому «связать» здесь означало бы
    // «отобрать». Такого выбора пикер не предлагает.
    const result = await chainCandidates('jtbd-hypothesis', jtbd.id)
    expect(result.ok && result.candidates).toEqual([])
  })

  it('shortens a JTBD to its key phrase', async () => {
    const { feature, jtbd } = await seedChain()
    const result = await chainCandidates('feature-jtbd', feature.id)
    expect(result.ok && result.candidates[0].label).toBe('Продлить его')
    expect(result.ok && result.candidates[0].fullLabel).toBe(jtbd.title)
  })

  it('refuses a record belonging to another tenant', async () => {
    await seedChain()
    const other = await otherUser()
    const otherProduct = await prisma.product.create({
      data: { name: 'Чужой', slug: 'chuzhoy-chain', userId: other.id },
    })
    const otherJtbd = await prisma.jTBD.create({
      data: {
        title: 'Чужая задача',
        category: 'Чужая',
        productId: otherProduct.id,
        userId: other.id,
      },
    })

    // Иначе чтение было бы оракулом: список кандидатов чужого продукта
    // рассказывает и о его существовании, и о его размере.
    expect(await chainCandidates('jtbd-segment', otherJtbd.id)).toEqual({
      ok: false,
      error: NOT_OWNED_ERROR,
    })
  })
})

describe('fillChainGap', () => {
  it('links a JTBD to a segment', async () => {
    const { jtbd, segment } = await seedChain()
    expect(await fillChainGap('jtbd-segment', jtbd.id, segment.id)).toEqual({ ok: true })
    const linked = await prisma.jTBD.findUnique({
      where: { id: jtbd.id },
      select: { segments: { select: { id: true } } },
    })
    expect(linked?.segments.map((s) => s.id)).toEqual([segment.id])
  })

  it('links a JTBD to a free hypothesis', async () => {
    const { jtbd, hypothesis } = await seedChain()
    expect(await fillChainGap('jtbd-hypothesis', jtbd.id, hypothesis.id)).toEqual({ ok: true })
    const linked = await prisma.hypothesis.findUnique({ where: { id: hypothesis.id } })
    expect(linked?.jtbdId).toBe(jtbd.id)
  })

  it('refuses to steal a hypothesis from another job', async () => {
    const { product, jtbd, hypothesis } = await seedChain()
    const otherJtbd = await prisma.jTBD.create({
      data: {
        title: 'Вторая задача',
        category: 'Выпуск',
        productId: product.id,
        userId: DEFAULT_USER_ID,
      },
    })
    await prisma.hypothesis.update({
      where: { id: hypothesis.id },
      data: { jtbdId: otherJtbd.id },
    })

    // Между показом списка и кликом связь мог поставить кто-то другой —
    // условие живёт на записи, а не только в отборе кандидатов.
    expect(await fillChainGap('jtbd-hypothesis', jtbd.id, hypothesis.id)).toEqual({
      ok: false,
      error: 'Гипотеза уже привязана к другой задаче',
    })
    const unchanged = await prisma.hypothesis.findUnique({ where: { id: hypothesis.id } })
    expect(unchanged?.jtbdId).toBe(otherJtbd.id)
  })

  it('links a JTBD to a feature and a feature to a JTBD from either side', async () => {
    const { jtbd, feature } = await seedChain()
    expect(await fillChainGap('jtbd-feature', jtbd.id, feature.id)).toEqual({ ok: true })
    const fromJob = await prisma.jTBD.findUnique({
      where: { id: jtbd.id },
      select: { features: { select: { id: true } } },
    })
    expect(fromJob?.features.map((f) => f.id)).toEqual([feature.id])

    const secondJtbd = await prisma.jTBD.create({
      data: {
        title: 'Вторая задача',
        category: 'Выпуск',
        productId: (await prisma.feature.findUniqueOrThrow({ where: { id: feature.id } }))
          .productId,
        userId: DEFAULT_USER_ID,
      },
    })
    expect(await fillChainGap('feature-jtbd', feature.id, secondJtbd.id)).toEqual({ ok: true })
    const fromFeature = await prisma.feature.findUnique({
      where: { id: feature.id },
      select: { jtbds: { select: { id: true } } },
    })
    expect(fromFeature?.jtbds).toHaveLength(2)
  })

  it('links a feature to an RTB', async () => {
    const { feature, rtb } = await seedChain()
    expect(await fillChainGap('feature-rtb', feature.id, rtb.id)).toEqual({ ok: true })
    const linked = await prisma.rTB.findUnique({
      where: { id: rtb.id },
      select: { features: { select: { id: true } } },
    })
    expect(linked?.features.map((f) => f.id)).toEqual([feature.id])
  })

  it('sets a hypothesis segment, job and feature', async () => {
    const { hypothesis, segment, jtbd, feature } = await seedChain()
    expect(await fillChainGap('hypothesis-segment', hypothesis.id, segment.id)).toEqual({
      ok: true,
    })
    expect(await fillChainGap('hypothesis-jtbd', hypothesis.id, jtbd.id)).toEqual({ ok: true })
    expect(await fillChainGap('hypothesis-feature', hypothesis.id, feature.id)).toEqual({
      ok: true,
    })

    const linked = await prisma.hypothesis.findUnique({
      where: { id: hypothesis.id },
      select: { segmentId: true, jtbdId: true, features: { select: { id: true } } },
    })
    expect(linked).toEqual({
      segmentId: segment.id,
      jtbdId: jtbd.id,
      features: [{ id: feature.id }],
    })
  })

  it('is idempotent', async () => {
    const { jtbd, segment } = await seedChain()
    await fillChainGap('jtbd-segment', jtbd.id, segment.id)
    await fillChainGap('jtbd-segment', jtbd.id, segment.id)
    const linked = await prisma.jTBD.findUnique({
      where: { id: jtbd.id },
      select: { segments: { select: { id: true } } },
    })
    expect(linked?.segments).toHaveLength(1)
  })

  it('refuses an anchor belonging to another tenant', async () => {
    const { segment } = await seedChain()
    const other = await otherUser()
    const otherProduct = await prisma.product.create({
      data: { name: 'Чужой 2', slug: 'chuzhoy-chain-2', userId: other.id },
    })
    const otherJtbd = await prisma.jTBD.create({
      data: {
        title: 'Чужая задача',
        category: 'Чужая',
        productId: otherProduct.id,
        userId: other.id,
      },
    })

    expect(await fillChainGap('jtbd-segment', otherJtbd.id, segment.id)).toEqual({
      ok: false,
      error: NOT_OWNED_ERROR,
    })
  })

  it('refuses a target belonging to another tenant', async () => {
    const { jtbd } = await seedChain()
    const other = await otherUser()
    const otherProduct = await prisma.product.create({
      data: { name: 'Чужой 3', slug: 'chuzhoy-chain-3', userId: other.id },
    })
    const otherSegment = await prisma.segment.create({
      data: {
        name: 'Чужой сегмент',
        slug: 'chuzhoy-seg-chain',
        productId: otherProduct.id,
        userId: other.id,
      },
    })

    // Якорь наш, поэтому проверки одного якоря не хватило бы: connect записал
    // бы чужой сегмент в нашу задачу.
    expect(await fillChainGap('jtbd-segment', jtbd.id, otherSegment.id)).toEqual({
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
