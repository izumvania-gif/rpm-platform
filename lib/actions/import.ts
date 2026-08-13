'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { slugify } from '@/lib/utils'
import { HypothesisStatus } from '@prisma/client'
import type { BulkEntity } from '@/lib/bulk-entry'
import { importFields } from '@/lib/csv-import'

// CSV import writer (plans/2.0-product-leap-plan.md, A2). Parsing and column
// mapping happen on the client (lib/csv-import.ts, unit tested); this takes
// the already-mapped rows and writes them, reusing the same ownership check
// and slug-disambiguation as lib/actions/bulk.ts.

const MAX_IMPORT_ROWS = 1000

function toList(value: string | undefined): string[] {
  if (!value) return []
  return value
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function toNumber(value: string | undefined): number | null {
  if (!value) return null
  // Tolerate a decimal comma — ru-locale spreadsheets write "12,5".
  const n = Number(value.replace(',', '.').replace(/[%\s]/g, ''))
  return Number.isFinite(n) ? n : null
}

export async function importRowsQuick(
  entity: BulkEntity,
  productId: string,
  rows: Record<string, string>[]
): Promise<{ ok: true; created: number } | { ok: false; error: string }> {
  if (!productId) return { ok: false, error: 'Укажите продукт' }
  if (rows.length === 0) return { ok: false, error: 'Нет строк для импорта' }
  if (rows.length > MAX_IMPORT_ROWS) {
    return {
      ok: false,
      error: `За один раз можно импортировать не больше ${MAX_IMPORT_ROWS} строк`,
    }
  }

  const userId = getCurrentUserId()
  const product = await prisma.product.findFirst({ where: { id: productId, userId } })
  if (!product) return { ok: false, error: 'Продукт не найден' }

  const required = importFields[entity].filter((f) => f.required).map((f) => f.key)
  const valid = rows.filter((r) => required.every((key) => (r[key] ?? '').trim()))
  if (valid.length === 0)
    return { ok: false, error: 'Ни в одной строке не заполнено обязательное поле' }

  let created = 0
  switch (entity) {
    case 'segment': {
      const existing = await prisma.segment.findMany({
        where: { productId },
        select: { slug: true },
      })
      const taken = new Set(existing.map((s) => s.slug))
      const data = valid.map((r) => {
        const name = r.name.trim()
        const base = slugify(name) || 'segment'
        let slug = base
        let n = 2
        while (taken.has(slug)) slug = `${base}-${n++}`
        taken.add(slug)
        return {
          name,
          slug,
          description: r.description?.trim() || null,
          audienceShare: toNumber(r.audienceShare),
          tags: toList(r.tags),
          productId,
          userId,
        }
      })
      created = (await prisma.segment.createMany({ data, skipDuplicates: true })).count
      break
    }
    case 'insight': {
      created = (
        await prisma.insight.createMany({
          data: valid.map((r) => ({
            text: r.text.trim(),
            tags: toList(r.tags),
            productId,
            userId,
          })),
        })
      ).count
      break
    }
    case 'hypothesis': {
      created = (
        await prisma.hypothesis.createMany({
          data: valid.map((r) => ({
            statement: r.statement.trim(),
            // Hypothesis.priority is Int? — a spreadsheet may well hold "2,5".
            priority: (() => {
              const n = toNumber(r.priority)
              return n === null ? null : Math.round(n)
            })(),
            tags: toList(r.tags),
            status: HypothesisStatus.DRAFT,
            productId,
            userId,
          })),
        })
      ).count
      break
    }
    case 'feature': {
      created = (
        await prisma.feature.createMany({
          data: valid.map((r) => ({
            name: r.name.trim(),
            description: r.description?.trim() || null,
            productId,
            userId,
          })),
        })
      ).count
      break
    }
    case 'competitor': {
      created = (
        await prisma.competitor.createMany({
          data: valid.map((r) => ({
            name: r.name.trim(),
            url: r.url?.trim() || null,
            positioning: r.positioning?.trim() || null,
            pricingModel: r.pricingModel?.trim() || null,
            companySize: r.companySize?.trim() || null,
            features: [],
            productId,
            userId,
          })),
        })
      ).count
      break
    }
  }

  revalidatePath('/segments')
  revalidatePath('/insights')
  revalidatePath('/hypotheses')
  revalidatePath('/features')
  revalidatePath('/competitors')
  revalidatePath(`/products/${productId}`)
  return { ok: true, created }
}
