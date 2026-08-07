'use client'

import { useState, useTransition } from 'react'
import type { Segment } from '@prisma/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createSegmentQuick } from '@/lib/actions/segments'
import { WizardEntryList } from './wizard-entry-list'

export function SegmentsStepForm({
  productId,
  initialSegments,
}: {
  productId: string
  initialSegments: Segment[]
}) {
  const [segments, setSegments] = useState(initialSegments)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit() {
    if (!name.trim()) return
    startTransition(async () => {
      const result = await createSegmentQuick(productId, name)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSegments((prev) => [...prev, result.segment])
      setName('')
      setError(null)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submit()
            }
          }}
          placeholder="Например: Банки топ-30"
        />
        <Button type="button" disabled={isPending || !name.trim()} onClick={submit}>
          Добавить
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <WizardEntryList
        items={segments.map((s) => ({ id: s.id, label: s.name }))}
        emptyLabel="Сегментов пока нет — добавьте первый выше."
      />
    </div>
  )
}
