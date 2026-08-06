'use client'

import { Select } from '@/components/ui/select'

export interface FeatureFilterOption {
  id: string
  label: string
}

export function FeatureFilterForm({
  jtbdOptions,
  segmentOptions,
  jtbdId,
  segmentId,
  sort,
  sortOptions,
}: {
  jtbdOptions: FeatureFilterOption[]
  segmentOptions: FeatureFilterOption[]
  jtbdId?: string
  segmentId?: string
  sort: string
  sortOptions: { value: string; label: string }[]
}) {
  return (
    <form method="get" className="flex flex-wrap items-center gap-2">
      <Select
        name="jtbdId"
        defaultValue={jtbdId ?? ''}
        aria-label="JTBD"
        className="w-auto max-w-[220px]"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        <option value="">Все JTBD</option>
        {jtbdOptions.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </Select>
      <Select
        name="segmentId"
        defaultValue={segmentId ?? ''}
        aria-label="Сегмент"
        className="w-auto max-w-[220px]"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        <option value="">Все сегменты</option>
        {segmentOptions.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </Select>
      <Select
        name="sort"
        defaultValue={sort}
        aria-label="Сортировка"
        className="w-auto"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        {sortOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </form>
  )
}
