'use client'

import { Button } from '@/components/ui/button'

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function CsvExportButton({
  rows,
  filename,
}: {
  rows: Record<string, string | number>[]
  filename: string
}) {
  return (
    <Button
      type="button"
      variant="outline"
      disabled={rows.length === 0}
      onClick={() => {
        const headers = Object.keys(rows[0])
        const lines = [
          headers.join(','),
          ...rows.map((row) => headers.map((h) => csvEscape(String(row[h] ?? ''))).join(',')),
        ]
        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
      }}
    >
      Экспорт CSV
    </Button>
  )
}
