'use client'

import { useState, useTransition } from 'react'
import { Check } from 'lucide-react'
import Link from 'next/link'
import { setLink } from '@/lib/actions/links'
import {
  columnCounts,
  headerHeightPx,
  linkKey,
  truncateHeader,
  unlinkedRowCount,
  type LinkKind,
  type MatrixAxisItem,
} from '@/lib/link-matrix'

// A grid of checkboxes standing in for N edit-form round trips.
//
// The interaction has to be cheap enough that ticking a whole column is not a
// decision — so the toggle is optimistic (the tick appears before the write
// returns) and the only thing that ever moves is the cell itself. Nothing is
// re-sorted, nothing collapses, and a failed write puts the cell back exactly
// where it was and says so, rather than leaving a tick that isn't in the
// database.
export function LinkMatrix({
  kind,
  rows,
  cols,
  initialLinks,
  rowHeader,
  colHeader,
}: {
  kind: LinkKind
  rows: MatrixAxisItem[]
  cols: MatrixAxisItem[]
  /** `linkKey(rowId, colId)` for every existing link. */
  initialLinks: string[]
  rowHeader: string
  colHeader: string
}) {
  const [links, setLinks] = useState<Set<string>>(() => new Set(initialLinks))
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const counts = columnCounts(cols, links)
  const headerHeight = headerHeightPx(cols)
  const unlinked = unlinkedRowCount(rows, links)

  function toggle(row: MatrixAxisItem, col: MatrixAxisItem) {
    const key = linkKey(row.id, col.id)
    const next = !links.has(key)
    setLinks((prev) => {
      const copy = new Set(prev)
      if (next) copy.add(key)
      else copy.delete(key)
      return copy
    })
    setError(null)
    startTransition(async () => {
      const response = await setLink(kind, row.id, col.id, next)
      if (response.ok) return
      // Put it back: a tick that is not in the database is worse than no tick.
      setLinks((prev) => {
        const copy = new Set(prev)
        if (next) copy.delete(key)
        else copy.add(key)
        return copy
      })
      setError(response.error)
    })
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {unlinked > 0 ? (
          <span className="text-[hsl(var(--signal-amber-text))]">
            Без связи: {unlinked} из {rows.length}
          </span>
        ) : (
          <>
            Все строки связаны — {rows.length} из {rows.length}
          </>
        )}
      </p>

      <div className="overflow-x-auto rounded-md border">
        <table className="text-sm">
          <thead>
            <tr className="border-b">
              <th
                scope="col"
                className="sticky left-0 z-10 min-w-[15rem] max-w-[22rem] bg-background px-3 py-2 text-left align-bottom text-xs font-medium text-muted-foreground"
              >
                {rowHeader} <span className="font-normal">/ {colHeader}</span>
              </th>
              {cols.map((col) => (
                <th
                  key={col.id}
                  scope="col"
                  // Rotated so a column stays one checkbox wide however long
                  // its name is — a horizontal header would set the column
                  // width and push the grid off screen after four columns.
                  className="w-9 px-0 py-2 align-bottom"
                  style={{ height: headerHeight }}
                  title={col.fullLabel ?? col.label}
                >
                  <div
                    className="mx-auto whitespace-nowrap text-left text-xs font-medium"
                    style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                  >
                    {truncateHeader(col.label)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b last:border-b-0">
                <th
                  scope="row"
                  className="sticky left-0 z-10 min-w-[15rem] max-w-[22rem] truncate bg-background px-3 py-1.5 text-left font-normal"
                  title={row.fullLabel ?? row.label}
                >
                  {row.href ? (
                    <Link href={row.href} className="hover:underline">
                      {row.label}
                    </Link>
                  ) : (
                    row.label
                  )}
                </th>
                {cols.map((col) => {
                  const checked = links.has(linkKey(row.id, col.id))
                  return (
                    <td key={col.id} className="p-0 text-center">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={checked}
                        // Both names, because a screen reader lands on the
                        // cell with neither header in context.
                        aria-label={`${row.fullLabel ?? row.label} — ${col.fullLabel ?? col.label}`}
                        onClick={() => toggle(row, col)}
                        className="flex h-8 w-9 items-center justify-center transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {checked ? (
                          <Check size={15} className="text-[hsl(var(--primary))]" />
                        ) : (
                          <span
                            aria-hidden
                            className="h-3.5 w-3.5 rounded-[3px] border border-input"
                          />
                        )}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t bg-muted/40">
              <td className="sticky left-0 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
                Связей на столбец
              </td>
              {cols.map((col) => (
                <td
                  key={col.id}
                  className={
                    'py-1.5 text-center font-mono text-xs tabular-nums ' +
                    (counts[col.id] === 0
                      ? 'text-[hsl(var(--signal-amber-text))]'
                      : 'text-muted-foreground')
                  }
                >
                  {counts[col.id]}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
