'use server'

import { revalidatePath } from 'next/cache'
import { HypothesisStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { slugify } from '@/lib/utils'
import { templateByKey } from '@/lib/starter-templates'

// Applies a starter template (plans/2.0-product-leap-plan.md, A4).
//
// Everything lands unconfirmed: JTBD keep `confirmed: false` (the default) and
// hypotheses land in DRAFT, so template content walks the same confirmation
// path as hand-entered content and the gaps dashboard still counts it as
// unverified. A skeleton is a starting point, not evidence.
//
// Appends rather than replaces — a PM may apply a template to a product that
// already has a few records, and silently wiping those would be the worst
// possible behaviour for a one-click action.
export async function applyStarterTemplate(
  productId: string,
  templateKey: string
): Promise<
  { ok: true; segments: number; jtbds: number; hypotheses: number } | { ok: false; error: string }
> {
  const template = templateByKey(templateKey)
  if (!template) return { ok: false, error: 'Шаблон не найден' }

  const userId = getCurrentUserId()
  const product = await prisma.product.findFirst({ where: { id: productId, userId } })
  if (!product) return { ok: false, error: 'Продукт не найден' }

  const existing = await prisma.segment.findMany({
    where: { productId },
    select: { slug: true, name: true },
  })
  const takenSlugs = new Set(existing.map((s) => s.slug))
  const existingNames = new Set(existing.map((s) => s.name.toLowerCase()))

  // Segments first — JTBD link to them by index.
  const createdSegmentIds: (string | null)[] = []
  for (const segment of template.segments) {
    if (existingNames.has(segment.name.toLowerCase())) {
      const match = await prisma.segment.findFirst({
        where: { productId, name: segment.name },
        select: { id: true },
      })
      createdSegmentIds.push(match?.id ?? null)
      continue
    }
    const base = slugify(segment.name) || 'segment'
    let slug = base
    let n = 2
    while (takenSlugs.has(slug)) slug = `${base}-${n++}`
    takenSlugs.add(slug)

    const row = await prisma.segment.create({
      data: {
        name: segment.name,
        slug,
        description: segment.description ?? null,
        tags: [],
        productId,
        userId,
      },
      select: { id: true },
    })
    createdSegmentIds.push(row.id)
  }

  let jtbdCount = 0
  for (const jtbd of template.jtbds) {
    const segmentIds = jtbd.segmentIndexes
      .map((i) => createdSegmentIds[i])
      .filter((id): id is string => Boolean(id))
    await prisma.jTBD.create({
      data: {
        title: jtbd.title,
        category: jtbd.category,
        jobType: jtbd.jobType,
        productId,
        userId,
        segments: segmentIds.length ? { connect: segmentIds.map((id) => ({ id })) } : undefined,
      },
    })
    jtbdCount++
  }

  const hypotheses = await prisma.hypothesis.createMany({
    data: template.hypotheses.map((statement) => ({
      statement,
      status: HypothesisStatus.DRAFT,
      tags: [],
      productId,
      userId,
    })),
  })

  revalidatePath('/segments')
  revalidatePath('/jtbd')
  revalidatePath('/hypotheses')
  revalidatePath(`/products/${productId}`)
  return {
    ok: true,
    segments: createdSegmentIds.filter(Boolean).length,
    jtbds: jtbdCount,
    hypotheses: hypotheses.count,
  }
}
