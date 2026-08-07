'use client'

import { useState, useTransition } from 'react'
import type { CompetitorNewsItem } from '@prisma/client'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { createCompetitorNewsItem, deleteCompetitorNewsItem } from '@/lib/actions/competitor-news'

export function CompetitorNewsList({
  competitorId,
  initialItems,
}: {
  competitorId: string
  initialItems: CompetitorNewsItem[]
}) {
  const [items, setItems] = useState(initialItems)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit() {
    if (!title.trim()) return
    startTransition(async () => {
      const result = await createCompetitorNewsItem(competitorId, title, url, date, note)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setItems((prev) => [result.item, ...prev])
      setTitle('')
      setUrl('')
      setDate('')
      setNote('')
      setError(null)
    })
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id))
    startTransition(async () => {
      await deleteCompetitorNewsItem(id, competitorId)
    })
  }

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Записей пока нет.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-2 rounded-md border p-2 text-sm"
            >
              <div>
                <p className="font-medium">
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      {item.title}
                    </a>
                  ) : (
                    item.title
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.date.toLocaleDateString('ru-RU')}
                </p>
                {item.note && <p className="mt-1 text-muted-foreground">{item.note}</p>}
              </div>
              <button
                type="button"
                onClick={() => remove(item.id)}
                className="shrink-0 text-xs text-muted-foreground hover:text-destructive"
              >
                Удалить
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="space-y-2 rounded-md border p-3">
        <Input
          placeholder="Заголовок новости"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Input
            placeholder="Ссылка (необязательно)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Textarea
          placeholder="Заметка"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="button" disabled={isPending || !title.trim()} onClick={submit}>
          Добавить запись
        </Button>
      </div>
    </div>
  )
}
