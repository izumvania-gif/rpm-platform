'use client'

import { useState, useTransition } from 'react'
import type { Hypothesis, JTBD, Segment } from '@prisma/client'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { createHypothesisQuick } from '@/lib/actions/hypotheses'
import { WizardEntryList } from './wizard-entry-list'

type HypothesisWithRelations = Hypothesis & { segment: Segment | null; jtbd: JTBD | null }

export function HypothesesStepForm({
  productId,
  segments,
  jtbds,
  initialHypotheses,
}: {
  productId: string
  segments: Segment[]
  jtbds: JTBD[]
  initialHypotheses: HypothesisWithRelations[]
}) {
  const [hypotheses, setHypotheses] = useState(initialHypotheses)
  const [statement, setStatement] = useState('')
  const [jtbdId, setJtbdId] = useState('')
  const [segmentId, setSegmentId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit() {
    if (!statement.trim()) return
    startTransition(async () => {
      const result = await createHypothesisQuick(productId, statement, jtbdId || null, segmentId || null)
      if (!result.ok) {
        setError(result.error)
        return
      }
      const jtbd = jtbds.find((j) => j.id === jtbdId) ?? null
      const segment = segments.find((s) => s.id === segmentId) ?? null
      setHypotheses((prev) => [...prev, { ...result.hypothesis, jtbd, segment }])
      setStatement('')
      setError(null)
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-md border p-3">
        <Textarea
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          placeholder="Мы верим, что …, потому что …"
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Select value={jtbdId} onChange={(e) => setJtbdId(e.target.value)}>
            <option value="">JTBD не указан</option>
            {jtbds.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </Select>
          <Select value={segmentId} onChange={(e) => setSegmentId(e.target.value)}>
            <option value="">Сегмент не указан</option>
            {segments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <Button type="button" disabled={isPending || !statement.trim()} onClick={submit}>
          Добавить
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <WizardEntryList
        items={hypotheses.map((h) => ({
          id: h.id,
          label: h.statement,
          meta: [h.jtbd?.title, h.segment?.name].filter(Boolean).join(' · '),
        }))}
        emptyLabel="Гипотез пока нет — добавьте первую выше."
      />
    </div>
  )
}
