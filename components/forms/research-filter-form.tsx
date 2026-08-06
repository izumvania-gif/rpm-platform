'use client'

import { ResearchStatus, ResearchType } from '@prisma/client'
import { Select } from '@/components/ui/select'
import { statusLabels, typeLabels } from '@/lib/labels'

const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Сначала новые' },
  { value: 'date_asc', label: 'Сначала старые' },
  { value: 'title_asc', label: 'По названию' },
]

export function ResearchFilterForm({
  status,
  type,
  sort,
}: {
  status?: string
  type?: string
  sort: string
}) {
  return (
    <form method="get" className="flex flex-wrap items-center gap-2">
      <Select
        name="status"
        defaultValue={status ?? ''}
        className="w-auto"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        <option value="">Все статусы</option>
        {Object.values(ResearchStatus).map((s) => (
          <option key={s} value={s}>
            {statusLabels[s]}
          </option>
        ))}
      </Select>
      <Select
        name="type"
        defaultValue={type ?? ''}
        className="w-auto"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        <option value="">Все типы</option>
        {Object.values(ResearchType).map((t) => (
          <option key={t} value={t}>
            {typeLabels[t]}
          </option>
        ))}
      </Select>
      <Select
        name="sort"
        defaultValue={sort}
        className="w-auto"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </form>
  )
}

export { SORT_OPTIONS as RESEARCH_SORT_OPTIONS }
