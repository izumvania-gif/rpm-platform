import { beforeEach, describe, expect, it } from 'vitest'
import { InsightStance } from '@prisma/client'
import { attachEvidence, evidenceCandidates } from '@/lib/actions/evidence'
import { prisma } from '@/lib/prisma'
import { createTestProduct, ensureTestUser } from '../helpers'
import { DEFAULT_USER_ID } from '@/lib/current-user'
import { NOT_OWNED_ERROR } from '@/lib/ownership'

beforeEach(ensureTestUser)

async function otherUser() {
  return prisma.user.create({
    data: {
      email: `other-evidence-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`,
      passwordHash: 'x',
    },
  })
}

async function seed() {
  const product = await createTestProduct()
  const [hypothesis, insight] = await Promise.all([
    prisma.hypothesis.create({
      data: {
        statement: 'Если выпускать удалённо, банки согласятся на пилот',
        productId: product.id,
        userId: DEFAULT_USER_ID,
      },
    }),
    prisma.insight.create({
      data: {
        text: '«Ждём выпуск неделю, за это время клиент уходит»',
        productId: product.id,
        userId: DEFAULT_USER_ID,
      },
    }),
  ])
  return { product, hypothesis, insight }
}

describe('evidenceCandidates', () => {
  it('offers unattached insights of the product, key phrase first', async () => {
    const { hypothesis, insight } = await seed()
    const result = await evidenceCandidates(hypothesis.id)
    expect(result.ok && result.candidates).toEqual([
      { id: insight.id, label: insight.text, fullLabel: insight.text },
    ])
  })

  it('hides an insight once it is attached anywhere', async () => {
    const { product, hypothesis, insight } = await seed()
    const otherHypothesis = await prisma.hypothesis.create({
      data: { statement: 'Другая гипотеза', productId: product.id, userId: DEFAULT_USER_ID },
    })
    await prisma.insight.update({
      where: { id: insight.id },
      data: { hypothesisId: otherHypothesis.id },
    })

    // Insight.hypothesisId одна на запись: предложить чужое доказательство —
    // значит предложить его отобрать.
    const result = await evidenceCandidates(hypothesis.id)
    expect(result.ok && result.candidates).toEqual([])
  })

  it('stays inside the product', async () => {
    const { hypothesis } = await seed()
    const otherProduct = await prisma.product.create({
      data: { name: 'Второй продукт', slug: 'vtoroy-evidence', userId: DEFAULT_USER_ID },
    })
    await prisma.insight.create({
      data: {
        text: 'Инсайт другого продукта',
        productId: otherProduct.id,
        userId: DEFAULT_USER_ID,
      },
    })

    const result = await evidenceCandidates(hypothesis.id)
    expect(result.ok && result.candidates.map((c) => c.fullLabel)).toEqual([
      '«Ждём выпуск неделю, за это время клиент уходит»',
    ])
  })

  it('refuses a hypothesis belonging to another tenant', async () => {
    const other = await otherUser()
    const otherProduct = await prisma.product.create({
      data: { name: 'Чужой', slug: 'chuzhoy-evidence', userId: other.id },
    })
    const otherHypothesis = await prisma.hypothesis.create({
      data: { statement: 'Чужая гипотеза', productId: otherProduct.id, userId: other.id },
    })

    expect(await evidenceCandidates(otherHypothesis.id)).toEqual({
      ok: false,
      error: NOT_OWNED_ERROR,
    })
  })
})

describe('attachEvidence', () => {
  it('links the insight with the chosen stance', async () => {
    const { hypothesis, insight } = await seed()
    expect(await attachEvidence(hypothesis.id, insight.id, InsightStance.SUPPORTS)).toEqual({
      ok: true,
    })
    const row = await prisma.insight.findUniqueOrThrow({ where: { id: insight.id } })
    expect(row.hypothesisId).toBe(hypothesis.id)
    expect(row.stance).toBe(InsightStance.SUPPORTS)
  })

  it('accepts an insight that takes no side', async () => {
    const { hypothesis, insight } = await seed()
    expect(await attachEvidence(hypothesis.id, insight.id, null)).toEqual({ ok: true })
    const row = await prisma.insight.findUniqueOrThrow({ where: { id: insight.id } })
    expect(row.hypothesisId).toBe(hypothesis.id)
    expect(row.stance).toBeNull()
  })

  it('does not steal an insight already attached to another hypothesis', async () => {
    const { product, hypothesis, insight } = await seed()
    const otherHypothesis = await prisma.hypothesis.create({
      data: { statement: 'Другая гипотеза', productId: product.id, userId: DEFAULT_USER_ID },
    })
    await prisma.insight.update({
      where: { id: insight.id },
      data: { hypothesisId: otherHypothesis.id },
    })

    const result = await attachEvidence(hypothesis.id, insight.id, null)
    expect(result.ok).toBe(false)
    const row = await prisma.insight.findUniqueOrThrow({ where: { id: insight.id } })
    expect(row.hypothesisId).toBe(otherHypothesis.id)
  })

  it('refuses an insight from another product', async () => {
    const { hypothesis } = await seed()
    const otherProduct = await prisma.product.create({
      data: { name: 'Второй продукт', slug: 'vtoroy-evidence-2', userId: DEFAULT_USER_ID },
    })
    const foreign = await prisma.insight.create({
      data: {
        text: 'Инсайт другого продукта',
        productId: otherProduct.id,
        userId: DEFAULT_USER_ID,
      },
    })

    const result = await attachEvidence(hypothesis.id, foreign.id, null)
    expect(result.ok).toBe(false)
    const row = await prisma.insight.findUniqueOrThrow({ where: { id: foreign.id } })
    expect(row.hypothesisId).toBeNull()
  })

  it('rejects a stance outside the enum', async () => {
    const { hypothesis, insight } = await seed()
    const result = await attachEvidence(hypothesis.id, insight.id, 'MAYBE' as InsightStance)
    expect(result.ok).toBe(false)
    const row = await prisma.insight.findUniqueOrThrow({ where: { id: insight.id } })
    expect(row.hypothesisId).toBeNull()
  })

  it('guards both ids against another tenant', async () => {
    const { hypothesis, insight } = await seed()
    const other = await otherUser()
    const otherProduct = await prisma.product.create({
      data: { name: 'Чужой', slug: 'chuzhoy-evidence-2', userId: other.id },
    })
    const otherHypothesis = await prisma.hypothesis.create({
      data: { statement: 'Чужая гипотеза', productId: otherProduct.id, userId: other.id },
    })
    const otherInsight = await prisma.insight.create({
      data: { text: 'Чужой инсайт', productId: otherProduct.id, userId: other.id },
    })

    // Чужая гипотеза — и чужой инсайт: обе половины связи проверяются, иначе
    // одна из них оставалась бы межарендной записью.
    expect(await attachEvidence(otherHypothesis.id, insight.id, null)).toEqual({
      ok: false,
      error: NOT_OWNED_ERROR,
    })
    expect(await attachEvidence(hypothesis.id, otherInsight.id, null)).toEqual({
      ok: false,
      error: NOT_OWNED_ERROR,
    })
    expect(
      (await prisma.insight.findUniqueOrThrow({ where: { id: otherInsight.id } })).hypothesisId
    ).toBeNull()
  })
})
