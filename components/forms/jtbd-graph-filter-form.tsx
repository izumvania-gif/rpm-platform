'use client'

import type { Product } from '@prisma/client'
import { Select } from '@/components/ui/select'

export function JtbdGraphFilterForm({
  products,
  productId,
  categories,
  category,
}: {
  products: Product[]
  productId: string
  categories: string[]
  category?: string
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
