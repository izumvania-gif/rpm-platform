'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { slugify } from '@/lib/utils'
import { HypothesisStatus } from '@prisma/client'
import { MAX_BULK_LINES, bulkEntityExtra, parseBulkLines, type BulkEntity } from '@/lib/bulk-entry'

// Bulk paste-many entry (plans/2.0-product-leap-plan.md, A1).
//
// The measured cost of the one-form-per-record path was 2 full page loads per
// record — ~96 to reach the demo dataset's 48 records. A PM who already has
// nine segments listed in a document had to retype them one form at a time.
// This takes the whole list at once: one action call, one transaction, one
// revalidate.
//
// Limited to entities whose *required* shape is a single string plus a
// product — with one exception. JTBD additionally requires a category, and
// inventing one would poison the coverage and gaps reports that JTBD exists
// to feed; so the panel asks for it once and applies it to the whole paste,
// exactly as the quick-capture overlay asks per record. Nothing here is ever
// filled in on the user's behalf.
//
// Still excluded: Разговор (a transcript), Исследование (type/status/date),
// Продукт (its own identity) — a list of names is not those records.

export async function createManyQuick(
  entity: BulkEntity,
  productId: string,
  rawText: string,
  extra?: string
): Promise<{ ok: true; created: number } | { ok: false; error: string }> {
  if (!productId) return { ok: false, error: 'Укажите продукт' }

  const required = bulkEntityExtra[entity]
  const extraValue = extra?.trim() ?? ''
  if (required && !extraValue) return { ok: false, error: `Укажите «${required.label}»` }

  const lines = parseBulkLines(rawText)
  if (lines.length === 0) return { ok: false, error: 'Нет ни одной непустой строки' }
  if (lines.length > MAX_BULK_LINES) {
    return { ok: false, error: `За один раз можно добавить не больше ${MAX_BULK_LINES} строк` }
  }

  const userId = getCurrentUserId()
  // Guard against a productId that isn't this user's before writing N rows
  // against it — the per-row create would otherwise happily attach them.
  const product = await prisma.product.findFirst({ where: { id: productId, userId } })
  if (!product) return { ok: false, error: 'Продукт не найден' }

  let created = 0
  switch (entity) {
    case 'segment': {
      // Segment is the only one of these with a generated column: slug is
      // unique per product (@@unique([productId, slug])). Two pasted lines
      // can easily slugify to the same value ("Банки топ-30" / "Банки
      // топ 30"), and existing segments may already hold the slug, so each
      // one is disambiguated against both before insert.
      const existing = await prisma.segment.findMany({
        where: { productId },
        select: { slug: true },
      })
      const taken = new Set(existing.map((s) => s.slug))
      const data = lines.map((name) => {
        const base = slugify(name) || 'segment'
        let slug = base
        let n = 2
        while (taken.has(slug)) slug = `${base}-${n++}`
        taken.add(slug)
        return { name, slug, productId, userId }
      })
      const result = await prisma.segment.createMany({ data, skipDuplicates: true })
      created = result.count
      break
    }
    case 'jtbd': {
      const result = await prisma.jTBD.createMany({
        data: lines.map((title) => ({ title, category: extraValue, productId, userId })),
      })
      created = result.count
      break
    }
    case 'insight': {
      const result = await prisma.insight.createMany({
        data: lines.map((text) => ({ text, productId, userId })),
      })
      created = result.count
      break
    }
    case 'hypothesis': {
      const result = await prisma.hypothesis.createMany({
        data: lines.map((statement) => ({
          statement,
          status: HypothesisStatus.DRAFT,
          productId,
          userId,
        })),
      })
      created = result.count
      break
    }
    case 'feature': {
      const result = await prisma.feature.createMany({
        data: lines.map((name) => ({ name, productId, userId })),
      })
      created = result.count
      break
    }
    case 'rtb': {
      const result = await prisma.rTB.createMany({
        data: lines.map((statement) => ({ statement, productId, userId })),
      })
      created = result.count
      break
    }
    case 'competitor': {
      const result = await prisma.competitor.createMany({
        data: lines.map((name) => ({ name, productId, userId })),
      })
      created = result.count
      break
    }
  }

  revalidatePath('/segments')
  revalidatePath('/insights')
  revalidatePath('/jtbd')
  revalidatePath('/hypotheses')
  revalidatePath('/features')
  revalidatePath('/marketing')
  revalidatePath('/competitors')
  revalidatePath(`/products/${productId}`)
  return { ok: true, created }
}
