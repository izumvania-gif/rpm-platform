'use client'

import type { Product } from '@prisma/client'
import { Select } from '@/components/ui/select'

export function InsightsProductFilterForm({
  products,
  productId,
}: {
  products: Product[]
  productId: string
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
    </form>
  )
}
