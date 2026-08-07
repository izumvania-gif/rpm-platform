'use client'

import { useState, useTransition } from 'react'
import type { Competitor } from '@prisma/client'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { createCompetitorQuick } from '@/lib/actions/competitors'
import { WizardEntryList } from './wizard-entry-list'

export function CompetitorsStepForm({
  productId,
  initialCompetitors,
}: {
  productId: string
  initialCompetitors: Competitor[]
}) {
  const [competitors, setCompetitors] = useState(initialCompetitors)
  const [name, setName] = useState('')
  const [positioning, setPositioning] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit() {
    if (!name.trim()) return
    startTransition(async () => {
      const result = await createCompetitorQuick(productId, name, positioning)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setCompetitors((prev) => [...prev, result.competitor])
      setName('')
      setPositioning('')
      setError(null)
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-md border p-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Название конкурента" />
        <Textarea
          value={positioning}
          onChange={(e) => setPositioning(e.target.value)}
          placeholder="Как они себя позиционируют (необязательно)"
        />
        <Button type="button" disabled={isPending || !name.trim()} onClick={submit}>
          Добавить
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <WizardEntryList
        items={competitors.map((c) => ({ id: c.id, label: c.name, meta: c.positioning ?? undefined }))}
        emptyLabel="Конкурентов пока нет — добавьте первого выше."
      />
    </div>
  )
}
