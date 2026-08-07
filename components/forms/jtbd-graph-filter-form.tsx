'use client'

import type { Product, Segment } from '@prisma/client'
import { Select } from '@/components/ui/select'
import { OVERALL_VIEW_KEY } from '@/lib/jtbd-graph-layout'

export function JtbdGraphFilterForm({
  products,
  productId,
  categories,
  category,
  segments,
  segment,
}: {
  products: Product[]
  productId: string
  categories: string[]
  category?: string
  segments: Segment[]
  segment?: string
}) {
  return (
    <form method="get" className="flex flex-wrap items-center gap-2">
      <Select
        name="productId"
        defaultValue={productId}
        aria-label="Продукт"
        className="w-auto"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        {products.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </Select>
      <Select
        name="segment"
        defaultValue={segment ?? OVERALL_VIEW_KEY}
        aria-label="Граф"
        className="w-auto"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        title="У каждого графа — общего и по каждому сегменту — своя независимая раскладка узлов"
      >
        <option value={OVERALL_VIEW_KEY}>Общий граф</option>
        {segments.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>
      <Select
        name="category"
        defaultValue={category ?? ''}
        aria-label="Категория"
        className="w-auto"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        <option value="">Все категории</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>
    </form>
  )
}
