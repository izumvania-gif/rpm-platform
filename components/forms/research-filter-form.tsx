'use client'

import { ResearchStatus, ResearchType } from '@prisma/client'
import { Select } from '@/components/ui/select'
import { statusLabels, typeLabels } from '@/lib/labels'

export function ResearchFilterForm({
  status,
  type,
  sort,
  sortOptions,
}: {
  status?: string
  type?: string
  sort: string
  sortOptions: { value: string; label: string }[]
}) {
  return (
    <form method="get" className="flex flex-wrap items-center gap-2">
      <Select
        name="status"
        defaultValue={status ?? ''}
        aria-label="Статус"
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
        aria-label="Тип"
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
