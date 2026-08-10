'use client'

import type { Product, Segment } from '@prisma/client'
import { Select } from '@/components/ui/select'

// Segment names repeat across products (see lib/cpo-metrics.ts's ecosystem
// correlations, which rely on exactly that) — grouped by product via
// <optgroup> (plans/2.0-ux-improvement-plan.md, Фаза 4) rather than a flat
// "Продукт — Сегмент" prefix on every option, now that the group label
// itself disambiguates. `segments` arrives already sorted by product name
// then segment name (app/marketing-hub/page.tsx), so a single pass groups
// consecutive entries with no separate sort here.
export function MarketingSegmentFilterForm({
  segments,
  segmentId,
}: {
  segments: (Segment & { product: Pick<Product, 'id' | 'name'> })[]
  segmentId: string
}) {
  const groups: { productId: string; productName: string; segments: typeof segments }[] = []
  for (const segment of segments) {
    const last = groups[groups.length - 1]
    if (last?.productId === segment.product.id) {
      last.segments.push(segment)
    } else {
      groups.push({
        productId: segment.product.id,
        productName: segment.product.name,
        segments: [segment],
      })
    }
  }

  return (
    <form method="get" className="flex flex-wrap items-center gap-2">
      <Select
        name="segmentId"
        defaultValue={segmentId}
        aria-label="Сегмент"
        className="w-auto"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        {groups.map((group) => (
          <optgroup key={group.productId} label={group.productName}>
            {group.segments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </optgroup>
        ))}
      </Select>
    </form>
  )
}
