'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { setDefaultProductId } from '@/lib/client-storage'
import { bulkEntityLabels, type BulkEntity } from '@/lib/bulk-entry'
import { parseInbox, summarize, type InboxItem } from '@/lib/inbox'
import { createFromInbox } from '@/lib/actions/inbox'

// Inbox review queue (plans/2.0-product-leap-plan.md, B1).
//
// Two steps on one screen: paste, then review. The review list is the whole
// point — each line carries its own guessed type with the reason for the
// guess, and changing it is one select away. Nothing is written until
// "Добавить" is pressed, which is also the contract B2's AI version inherits.
const TYPES: BulkEntity[] = ['segment', 'insight', 'hypothesis', 'feature', 'competitor']

const SAMPLE = [
  'Банки топ-30',
  '«Мы не можем ждать неделю выпуска сертификата — люди простаивают»',
  'Если убрать визит в офис, то онбординг сократится вдвое',
  'Нужна возможность массового отзыва доступов',
  'Основной конкурент — КриптоПро',
].join('\n')

export function InboxComposer({
  products,
  initialProductId,
}: {
  products: { id: string; name: string }[]
  initialProductId: string
}) {
  const router = useRouter()
  const [productId, setProductId] = useState(initialProductId)
  const [raw, setRaw] = useState('')
  const [items, setItems] = useState<InboxItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const preview = useMemo(() => (raw.trim() ? parseInbox(raw) : []), [raw])
  const active = items ?? preview
  const summary = useMemo(() => summarize(active), [active])
  const includedCount = active.filter((i) => i.include && i.text.trim()).length

  function update(id: string, patch: Partial<InboxItem>) {
    setItems((prev) => (prev ?? preview).map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }

  function reset() {
    setRaw('')
    setItems(null)
    setError(null)
  }

  function submit() {
    startTransition(async () => {
      const response = await createFromInbox(
        productId,
        active
          .filter((i) => i.include && i.text.trim())
          .map((i) => ({ text: i.text, type: i.type }))
      )
      if (!response.ok) {
        setError(response.error)
        return
      }
      setDefaultProductId(productId)
      const parts = TYPES.filter((t) => response.created[t] > 0).map(
        (t) => `${bulkEntityLabels[t].toLowerCase()}: ${response.created[t]}`
      )
      setResult(`Добавлено ${response.total} — ${parts.join(', ')}`)
      reset()
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm">
          <span className="block text-muted-foreground">Продукт</span>
          <Select
            aria-label="Продукт"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </label>
        {raw.trim() === '' && (
          <Button type="button" variant="outline" size="sm" onClick={() => setRaw(SAMPLE)}>
            Подставить пример
          </Button>
        )}
      </div>

      <Textarea
        rows={8}
        value={raw}
        aria-label="Вставьте текст"
        placeholder={
          'Вставьте что угодно: заметки со встречи, кусок транскрипта, список из письма.\n' +
          'Каждая строка станет отдельной записью — тип подставится сам, его можно поменять.'
        }
        onChange={(e) => {
          setRaw(e.target.value)
          // Re-parsing drops manual edits on purpose: the pasted text is the
          // source of truth until the user starts curating the list below.
          setItems(null)
          setResult(null)
        }}
      />

      {result && (
        <p role="status" className="text-sm text-muted-foreground">
          {result}
        </p>
      )}

      {active.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Что будет создано
            </p>
            {summary.map(({ type, count }) => (
              <span
                key={type}
                className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground"
              >
                {bulkEntityLabels[type]}: {count}
              </span>
            ))}
          </div>

          <ul className="divide-y rounded-md border">
            {active.map((item) => (
              <li
                key={item.id}
                className={cn(
                  'flex flex-wrap items-center gap-2 p-2 sm:flex-nowrap',
                  !item.include && 'opacity-45'
                )}
              >
                <input
                  type="checkbox"
                  checked={item.include}
                  aria-label={`Включить: ${item.text}`}
                  onChange={(e) => update(item.id, { include: e.target.checked })}
                  className="h-4 w-4 shrink-0 rounded border-input"
                />
                <Input
                  value={item.text}
                  aria-label={`Текст записи ${item.id}`}
                  onChange={(e) => update(item.id, { text: e.target.value })}
                  className="min-w-0 flex-1"
                />
                <div className="flex shrink-0 items-center gap-2">
                  <Select
                    aria-label={`Тип записи ${item.id}`}
                    value={item.type}
                    onChange={(e) =>
                      // A manual choice stops claiming to be a guess.
                      update(item.id, { type: e.target.value as BulkEntity, reason: 'вручную' })
                    }
                  >
                    {TYPES.map((t) => (
                      <option key={t} value={t}>
                        {bulkEntityLabels[t]}
                      </option>
                    ))}
                  </Select>
                  <span className="w-36 shrink-0 truncate text-xs text-muted-foreground">
                    {item.reason}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" disabled={isPending || includedCount === 0} onClick={submit}>
          {includedCount > 0 ? `Добавить (${includedCount})` : 'Добавить'}
        </Button>
        {active.length > 0 && (
          <Button type="button" variant="outline" onClick={reset}>
            Очистить
          </Button>
        )}
        <span className="text-xs text-muted-foreground">
          Ничего не сохраняется, пока не нажата кнопка
        </span>
      </div>
    </div>
  )
}
