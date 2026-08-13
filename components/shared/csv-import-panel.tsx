'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useRouter } from 'next/navigation'
import { bulkEntityLabels, type BulkEntity } from '@/lib/bulk-entry'
import {
  applyMapping,
  autoMapColumns,
  detectSeparator,
  importFields,
  parseCsv,
} from '@/lib/csv-import'
import { importRowsQuick } from '@/lib/actions/import'

// CSV import (plans/2.0-product-leap-plan.md, A2) — closes the loop with the
// CsvExportButton that already existed. Accepts a file or a paste straight
// out of a spreadsheet, auto-maps the header row onto fields (so a file this
// app exported re-imports with no mapping at all), and previews before
// writing.
const ENTITIES: BulkEntity[] = ['segment', 'insight', 'hypothesis', 'feature', 'competitor']
const PREVIEW_ROWS = 5

export function CsvImportPanel({ productId }: { productId: string }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [entity, setEntity] = useState<BulkEntity>('segment')
  const [raw, setRaw] = useState('')
  const [hasHeader, setHasHeader] = useState(true)
  const [mapping, setMapping] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const table = useMemo(() => (raw.trim() ? parseCsv(raw, detectSeparator(raw)) : []), [raw])
  // Memoised rather than `table[0] ?? []` inline: the fallback allocates a new
  // array each render, which would re-run every downstream useMemo.
  const headers = useMemo(() => table[0] ?? [], [table])
  const dataRows = useMemo(() => (hasHeader ? table.slice(1) : table), [table, hasHeader])

  // Auto-map on first parse of a given shape; the user can override after.
  const effectiveMapping = useMemo(() => {
    if (mapping && mapping.length === headers.length) return mapping
    return hasHeader
      ? autoMapColumns(headers, entity)
      : headers.map((_, i) => (i === 0 ? importFields[entity][0].key : ''))
  }, [mapping, headers, entity, hasHeader])

  const { rows, skipped } = useMemo(
    () => applyMapping(dataRows, effectiveMapping, entity),
    [dataRows, effectiveMapping, entity]
  )

  const requiredField = importFields[entity].find((f) => f.required)!
  const requiredMapped = effectiveMapping.includes(requiredField.key)

  function loadFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      setRaw(String(reader.result ?? ''))
      setMapping(null)
      setError(null)
      setResult(null)
    }
    reader.readAsText(file)
  }

  function reset() {
    setOpen(false)
    setRaw('')
    setMapping(null)
    setError(null)
    setResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function submit() {
    startTransition(async () => {
      const response = await importRowsQuick(
        entity,
        productId,
        rows.map((r) => r.values)
      )
      if (!response.ok) {
        setError(response.error)
        return
      }
      setRaw('')
      setMapping(null)
      setError(null)
      setResult(`Импортировано записей: ${response.created}`)
      if (fileRef.current) fileRef.current.value = ''
      router.refresh()
    })
  }

  if (!open) {
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        Импорт CSV
      </Button>
    )
  }

  return (
    <div className="w-full space-y-3 rounded-md border bg-background p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          aria-label="Что импортируем"
          value={entity}
          onChange={(e) => {
            setEntity(e.target.value as BulkEntity)
            setMapping(null)
          }}
          className="w-auto"
        >
          {ENTITIES.map((value) => (
            <option key={value} value={value}>
              {bulkEntityLabels[value]}
            </option>
          ))}
        </Select>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.tsv,.txt,text/csv"
          aria-label="Файл CSV"
          className="text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) loadFile(file)
          }}
        />
      </div>

      <Textarea
        rows={5}
        value={raw}
        placeholder={
          '…или вставьте таблицу прямо сюда\nНазвание,Сайт\nКриптоПро,https://cryptopro.ru'
        }
        onChange={(e) => {
          setRaw(e.target.value)
          setMapping(null)
          setResult(null)
        }}
      />

      {headers.length > 0 && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hasHeader}
              onChange={(e) => {
                setHasHeader(e.target.checked)
                setMapping(null)
              }}
              className="h-4 w-4 rounded border-input"
            />
            Первая строка — заголовки
          </label>

          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Колонки
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {headers.map((header, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-28 shrink-0 truncate text-xs text-muted-foreground">
                    {hasHeader ? header || `Колонка ${index + 1}` : `Колонка ${index + 1}`}
                  </span>
                  <Select
                    aria-label={`Колонка ${index + 1}`}
                    value={effectiveMapping[index] ?? ''}
                    onChange={(e) => {
                      const next = [...effectiveMapping]
                      next[index] = e.target.value
                      setMapping(next)
                    }}
                  >
                    <option value="">— пропустить —</option>
                    {importFields[entity].map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                        {f.required ? ' *' : ''}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>
          </div>

          {rows.length > 0 && (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    {importFields[entity]
                      .filter((f) => effectiveMapping.includes(f.key))
                      .map((f) => (
                        <th key={f.key} className="px-2 py-1.5 text-left text-xs font-medium">
                          {f.label}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, PREVIEW_ROWS).map((row, i) => (
                    <tr key={i} className="border-t">
                      {importFields[entity]
                        .filter((f) => effectiveMapping.includes(f.key))
                        .map((f) => (
                          <td key={f.key} className="max-w-[16rem] truncate px-2 py-1.5">
                            {row.values[f.key] ?? ''}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > PREVIEW_ROWS && (
                <p className="border-t px-2 py-1.5 text-xs text-muted-foreground">
                  …и ещё {rows.length - PREVIEW_ROWS}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="sm"
          disabled={isPending || rows.length === 0 || !requiredMapped}
          onClick={submit}
        >
          {rows.length > 0 ? `Импортировать (${rows.length})` : 'Импортировать'}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={reset}>
          Отмена
        </Button>
        {headers.length > 0 && !requiredMapped && (
          <span className="text-xs text-destructive">
            Назначьте колонку на «{requiredField.label}»
          </span>
        )}
        {skipped > 0 && (
          <span className="text-xs text-muted-foreground">
            строк без «{requiredField.label}» пропущено: {skipped}
          </span>
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
