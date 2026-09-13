'use client'

import type { Product } from '@prisma/client'
import { Select } from '@/components/ui/select'
import { ALL_PRODUCTS } from '@/lib/report-scope'

export function ReportsProductFilterForm({
  products,
  productId,
  allowAll = false,
}: {
  products: Product[]
  /** id продукта или ALL_PRODUCTS. */
  productId: string
  /** Добавить пункт «Все продукты» (фаза 20 — у «Пробелов» есть режим по всей базе). */
  allowAll?: boolean
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
        {allowAll && <option value={ALL_PRODUCTS}>Все продукты</option>}
      </Select>
    </form>
  )
}
