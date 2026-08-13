'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createManyQuick } from '@/lib/actions/bulk'
import {
  MAX_BULK_LINES,
  bulkEntityLabels,
  bulkEntityPlaceholders,
  parseBulkLines,
  type BulkEntity,
} from '@/lib/bulk-entry'

// Bulk paste-many entry (plans/2.0-product-leap-plan.md, A1).
//
// Same toggle-button-then-form shape as AddRoadmapItemForm/AddTeamMemberForm,
// but the field takes a whole list. The live preview count is the point: the
// user sees exactly how many records will be created (after blank/duplicate
// removal) before committing, so a stray trailing newline or a repeated line
// in the pasted list is visible rather than surprising.
const ENTITIES: BulkEntity[] = ['segment', 'insight', 'hypothesis', 'feature', 'competitor']

export function BulkAddPanel({ productId }: { productId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [entity, setEntity] = useState<BulkEntity>('segment')
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Same parser the server uses, so the count shown is the count created.
  const lines = useMemo(() => parseBulkLines(text), [text])
  const tooMany = lines.length > MAX_BULK_LINES

  function reset() {
    setOpen(false)
    setText('')
    setError(null)
    setResult(null)
  }

  function submit() {
    startTransition(async () => {
      const response = await createManyQuick(entity, productId, text)
      if (!response.ok) {
        setError(response.error)
        return
      }
      setText('')
      setError(null)
      setResult(`Добавлено записей: ${response.created}`)
      router.refresh()
    })
  }

  if (!open) {
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        Добавить списком
      </Button>
    )
  }

  return (
    <div className="w-full space-y-3 rounded-md border bg-background p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          aria-label="Что добавляем"
          value={entity}
          onChange={(e) => setEntity(e.target.value as BulkEntity)}
          className="w-auto"
        >
          {ENTITIES.map((value) => (
            <option key={value} value={value}>
              {bulkEntityLabels[value]}
            </option>
          ))}
        </Select>
        <span className="text-xs text-muted-foreground">по одной записи на строку</span>
      </div>

      <Textarea
        autoFocus
        rows={6}
        value={text}
        placeholder={bulkEntityPlaceholders[entity]}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="sm"
          disabled={isPending || lines.length === 0 || tooMany}
          onClick={submit}
        >
          {lines.length > 0 ? `Добавить (${lines.length})` : 'Добавить'}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={reset}>
          Отмена
        </Button>
        {tooMany ? (
          <span className="text-xs text-destructive">
            Не больше {MAX_BULK_LINES} строк за раз — сейчас {lines.length}
          </span>
        ) : (
          lines.length > 0 && (
            <span className="text-xs text-muted-foreground">
              пустые и повторяющиеся строки не считаются
            </span>
          )
        )}
        {result && (
          <span role="status" className="ml-auto text-xs text-muted-foreground">
            {result}
          </span>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
