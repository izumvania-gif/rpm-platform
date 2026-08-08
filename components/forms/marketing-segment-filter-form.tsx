'use client'

import type { Product, Segment } from '@prisma/client'
import { Select } from '@/components/ui/select'

// Segment names repeat across products (see lib/cpo-metrics.ts's ecosystem
// correlations, which rely on exactly that), so each option is prefixed
// with its product name to disambiguate — a flat segment list alone
// wouldn't tell two "Enterprise" segments apart.
export function MarketingSegmentFilterForm({
  segments,
  segmentId,
}: {
  segments: (Segment & { product: Pick<Product, 'id' | 'name'> })[]
  segmentId: string
}) {
  return (
    <form method="get" className="flex flex-wrap items-center gap-2">
      <Select
        name="segmentId"
        defaultValue={segmentId}
        aria-label="Сегмент"
        className="w-auto"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        {segments.map((s) => (
          <option key={s.id} value={s.id}>
            {s.product.name} — {s.name}
          </option>
        ))}
      </Select>
    </form>
  )
}
