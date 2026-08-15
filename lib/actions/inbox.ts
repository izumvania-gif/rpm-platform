'use server'

import { revalidatePath } from 'next/cache'
import { HypothesisStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { slugify } from '@/lib/utils'
import { INBOX_ENTITIES, type InboxEntity } from '@/lib/inbox'

// Inbox writer (plans/2.0-product-leap-plan.md, B1).
//
// Unlike createManyQuick (A1), which takes one type and N lines, this takes N
// (text, type) pairs — the whole point of the Inbox is that one paste yields
// records of several types at once.
//
// Same guarantees as every other bulk path here: the product's ownership is
// checked before anything is written, hypotheses land in DRAFT, and nothing
// is created until the human has pressed the confirm button.

const MAX_INBOX_ITEMS = 200

export interface InboxDraft {
  text: string
  type: InboxEntity
}

export type InboxResult = Record<InboxEntity, number>

export async function createFromInbox(
  productId: string,
  drafts: InboxDraft[]
): Promise<{ ok: true; created: InboxResult; total: number } | { ok: false; error: string }> {
  if (!productId) return { ok: false, error: 'Укажите продукт' }

  const clean = drafts
    .map((d) => ({ text: d.text.trim(), type: d.type }))
    .filter((d) => d.text.length > 0)
  if (clean.length === 0) return { ok: false, error: 'Нечего добавлять' }
  if (clean.length > MAX_INBOX_ITEMS) {
    return { ok: false, error: `За один раз можно добавить не больше ${MAX_INBOX_ITEMS} записей` }
  }

  const userId = getCurrentUserId()
  const product = await prisma.product.findFirst({ where: { id: productId, userId } })
  if (!product) return { ok: false, error: 'Продукт не найден' }

  const by = (type: InboxEntity) => clean.filter((d) => d.type === type).map((d) => d.text)
  const created = Object.fromEntries(INBOX_ENTITIES.map((t) => [t, 0])) as InboxResult

  const segmentNames = by('segment')
  if (segmentNames.length) {
    // Same per-product slug disambiguation as lib/actions/bulk.ts — slug is
    // unique per product and two pasted names can collapse to one slug.
    const existing = await prisma.segment.findMany({
      where: { productId },
      select: { slug: true },
    })
    const taken = new Set(existing.map((s) => s.slug))
    const data = segmentNames.map((name) => {
      const base = slugify(name) || 'segment'
      let slug = base
      let n = 2
      while (taken.has(slug)) slug = `${base}-${n++}`
      taken.add(slug)
      return { name, slug, tags: [], productId, userId }
    })
    created.segment = (await prisma.segment.createMany({ data, skipDuplicates: true })).count
  }

  const insightTexts = by('insight')
  if (insightTexts.length) {
    created.insight = (
      await prisma.insight.createMany({
        data: insightTexts.map((text) => ({ text, tags: [], productId, userId })),
      })
    ).count
  }

  const hypothesisTexts = by('hypothesis')
  if (hypothesisTexts.length) {
    created.hypothesis = (
      await prisma.hypothesis.createMany({
        data: hypothesisTexts.map((statement) => ({
          statement,
          status: HypothesisStatus.DRAFT,
          tags: [],
          productId,
          userId,
        })),
      })
    ).count
  }

  const featureNames = by('feature')
  if (featureNames.length) {
    created.feature = (
      await prisma.feature.createMany({
        data: featureNames.map((name) => ({ name, productId, userId })),
      })
    ).count
  }

  const rtbStatements = by('rtb')
  if (rtbStatements.length) {
    created.rtb = (
      await prisma.rTB.createMany({
        data: rtbStatements.map((statement) => ({ statement, productId, userId })),
      })
    ).count
  }

  const competitorNames = by('competitor')
  if (competitorNames.length) {
    created.competitor = (
      await prisma.competitor.createMany({
        data: competitorNames.map((name) => ({ name, features: [], productId, userId })),
      })
    ).count
  }

  revalidatePath('/segments')
  revalidatePath('/insights')
  revalidatePath('/hypotheses')
  revalidatePath('/features')
  revalidatePath('/marketing')
  revalidatePath('/competitors')
  revalidatePath(`/products/${productId}`)

  const total = Object.values(created).reduce((a, b) => a + b, 0)
  return { ok: true, created, total }
}
