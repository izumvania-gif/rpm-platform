'use client'

import { useState, useTransition } from 'react'
import type { Segment } from '@prisma/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createSegmentQuick } from '@/lib/actions/segments'

export function InlineCreateSegment({
  productId,
  onCreated,
}: {
  productId: string
  onCreated: (segment: Segment) => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!open) {
    return (
      <button
        type="button"
        className="text-xs text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
        disabled={!productId}
        onClick={() => setOpen(true)}
      >
        + Новый сегмент
      </button>
    )
  }

  function submit() {
    startTransition(async () => {
      const result = await createSegmentQuick(productId, name)
      if (!result.ok) {
        setError(result.error)
        return
      }
      onCreated(result.segment)
      setName('')
      setError(null)
      setOpen(false)
    })
  }

  return (
    <div className="mt-1 space-y-1">
      <div className="flex items-center gap-2">
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submit()
            }
          }}
          placeholder="Название сегмента"
          className="h-8 text-sm"
        />
        <Button type="button" size="sm" disabled={isPending || !name.trim()} onClick={submit}>
          Создать
        </Button>
        <button
          type="button"
          className="text-xs text-muted-foreground hover:underline"
          onClick={() => {
            setOpen(false)
            setError(null)
          }}
        >
          Отмена
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
