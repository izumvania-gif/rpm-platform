'use client'

import { Select } from '@/components/ui/select'

export function SortControl({
  current,
  options,
  name = 'sort',
  label,
}: {
  current: string
  options: { value: string; label: string }[]
  name?: string
  label?: string
}) {
  return (
    <Select
      name={name}
      defaultValue={current}
      aria-label={label}
      className="w-auto"
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  )
}
