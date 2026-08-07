'use client'

import { useState, useTransition } from 'react'
import { JtbdJobType, type JTBD, type Segment } from '@prisma/client'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { createJtbdQuick } from '@/lib/actions/jtbd-graph'
import { jtbdJobTypeLabels, jtbdJobTypeOrder } from '@/lib/jtbd-job-types'
import { WizardEntryList } from './wizard-entry-list'

type JtbdWithSegment = JTBD & { segment: Segment | null }

export function JtbdStepForm({
  productId,
  segments,
  initialJtbds,
  categories,
}: {
  productId: string
  segments: Segment[]
  initialJtbds: JtbdWithSegment[]
  categories: string[]
}) {
  const [jtbds, setJtbds] = useState(initialJtbds)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [jobType, setJobType] = useState<JtbdJobType>(JtbdJobType.SMALL_JOB)
  const [segmentId, setSegmentId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit() {
    if (!title.trim() || !category.trim()) return
    startTransition(async () => {
      const result = await createJtbdQuick(productId, title, category, jobType, segmentId || null)
      if (!result.ok) {
        setError(result.error)
        return
      }
      const segment = segments.find((s) => s.id === segmentId) ?? null
      setJtbds((prev) => [...prev, { ...result.jtbd, segment }])
      setTitle('')
      setCategory('')
      setError(null)
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-md border p-3">
        <Textarea
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Когда …, я хочу …, чтобы …"
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Категория"
            list="onboarding-jtbd-categories"
          />
          <datalist id="onboarding-jtbd-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <Select value={jobType} onChange={(e) => setJobType(e.target.value as JtbdJobType)}>
            {jtbdJobTypeOrder.map((type) => (
              <option key={type} value={type}>
                {jtbdJobTypeLabels[type]}
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
        <Button
          type="button"
          disabled={isPending || !title.trim() || !category.trim()}
          onClick={submit}
        >
          Добавить
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <WizardEntryList
        items={jtbds.map((j) => ({
          id: j.id,
          label: j.title,
          meta: [j.category, jtbdJobTypeLabels[j.jobType], j.segment?.name].filter(Boolean).join(' · '),
        }))}
        emptyLabel="JTBD пока нет — добавьте первую задачу выше."
      />
    </div>
  )
}
