import type { Product } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { ReportsProductFilterForm } from '@/components/forms/reports-product-filter-form'

export const dynamic = 'force-dynamic'

const NONE_KEY = '__none__'

export default async function SegmentsJtbdMatrixPage({
  searchParams,
}: {
  searchParams: { productId?: string }
}) {
  const userId = getCurrentUserId()
  const products = await prisma.product.findMany({ where: { userId }, orderBy: { name: 'asc' } })
  const productId = products.find((p) => p.id === searchParams.productId)?.id ?? products[0]?.id

  return (
    <main className="container py-12 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Матрица: Сегменты × JTBD</h1>
        <p className="text-sm text-muted-foreground">
          Какие задачи есть у каждого сегмента и насколько это подтверждено исследованиями. Столбцы
          — категории JTBD, ячейка — «подтверждено / всего» задач сегмента в этой категории.
        </p>
      </div>

      {!productId ? (
        <p className="text-muted-foreground">
          Сначала создайте продукт, сегменты и JTBD — матрице нужны хотя бы одни данные.
        </p>
      ) : (
        <MatrixSection productId={productId} products={products} />
      )}
    </main>
  )
}

async function MatrixSection({ productId, products }: { productId: string; products: Product[] }) {
  const userId = getCurrentUserId()
  const [segments, jtbds] = await Promise.all([
    prisma.segment.findMany({ where: { productId, userId }, orderBy: { name: 'asc' } }),
    prisma.jTBD.findMany({
      where: { productId, userId },
      include: { segments: { select: { id: true } } },
    }),
  ])

  const categories = Array.from(new Set(jtbds.map((j) => j.category))).sort((a, b) =>
    a.localeCompare(b, 'ru')
  )
  const hasUnsegmented = jtbds.some((j) => j.segments.length === 0)

  const rows: { key: string; label: string; color?: string }[] = [
    ...segments.map((s) => ({ key: s.id, label: s.name, color: s.color })),
    ...(hasUnsegmented ? [{ key: NONE_KEY, label: 'Без сегмента' }] : []),
  ]

  const cells = new Map<string, { total: number; confirmed: number }>()
  for (const jtbd of jtbds) {
    const rowKeys = jtbd.segments.length > 0 ? jtbd.segments.map((s) => s.id) : [NONE_KEY]
    for (const rowKey of rowKeys) {
      const key = `${rowKey}::${jtbd.category}`
      const cell = cells.get(key) ?? { total: 0, confirmed: 0 }
      cell.total += 1
      if (jtbd.confirmed) cell.confirmed += 1
      cells.set(key, cell)
    }
  }

  function cellAt(rowKey: string, category: string) {
    return cells.get(`${rowKey}::${category}`) ?? { total: 0, confirmed: 0 }
  }

  function rowTotal(rowKey: string) {
    return categories.reduce(
      (acc, category) => {
        const cell = cellAt(rowKey, category)
        return { total: acc.total + cell.total, confirmed: acc.confirmed + cell.confirmed }
      },
      { total: 0, confirmed: 0 }
    )
  }

  function columnTotal(category: string) {
    return rows.reduce(
      (acc, row) => {
        const cell = cellAt(row.key, category)
        return { total: acc.total + cell.total, confirmed: acc.confirmed + cell.confirmed }
      },
      { total: 0, confirmed: 0 }
    )
  }

  const grandTotal = rows.reduce(
    (acc, row) => {
      const t = rowTotal(row.key)
      return { total: acc.total + t.total, confirmed: acc.confirmed + t.confirmed }
    },
    { total: 0, confirmed: 0 }
  )

  return (
    <div className="space-y-4">
      <ReportsProductFilterForm products={products} productId={productId} />

      {rows.length === 0 || categories.length === 0 ? (
        <p className="text-muted-foreground">
          У этого продукта пока нет сегментов и JTBD одновременно — добавьте хотя бы по одной записи
          каждого типа, чтобы построить матрицу.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 px-3 sticky left-0 bg-background">Сегмент</th>
                {categories.map((category) => (
                  <th key={category} className="py-2 px-3 whitespace-nowrap">
                    {category}
                  </th>
                ))}
                <th className="py-2 px-3 whitespace-nowrap font-semibold">Итого</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const total = rowTotal(row.key)
                return (
                  <tr key={row.key} className="border-b last:border-b-0">
                    <td className="py-2 px-3 sticky left-0 bg-background font-medium">
                      <span className="flex items-center gap-2">
                        {row.color && (
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: row.color }}
                          />
                        )}
                        {row.label}
                      </span>
                    </td>
                    {categories.map((category) => {
                      const cell = cellAt(row.key, category)
                      const ratio = cell.total > 0 ? cell.confirmed / cell.total : null
                      return (
                        <td
                          key={category}
                          className="py-2 px-3 text-center tabular-nums"
                          style={
                            ratio !== null
                              ? { backgroundColor: `hsl(var(--primary) / ${0.08 + ratio * 0.32})` }
                              : undefined
                          }
                        >
                          {cell.total > 0 ? (
                            <span>
                              {cell.confirmed}/{cell.total}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="py-2 px-3 text-center font-semibold tabular-nums">
                      {total.confirmed}/{total.total}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/40 font-semibold">
                <td className="py-2 px-3 sticky left-0 bg-muted/40">Итого</td>
                {categories.map((category) => {
                  const total = columnTotal(category)
                  return (
                    <td key={category} className="py-2 px-3 text-center tabular-nums">
                      {total.confirmed}/{total.total}
                    </td>
                  )
                })}
                <td className="py-2 px-3 text-center tabular-nums">
                  {grandTotal.confirmed}/{grandTotal.total}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
