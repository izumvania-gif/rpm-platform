'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { RoadmapStatus, type Feature, type Person } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { createRoadmapItemQuick } from '@/lib/actions/roadmap'
import { roadmapStatusLabels } from '@/lib/labels'
import { InlineCreatePerson } from '@/components/shared/inline-create'

// Inline "Добавить пункт" (plans/2.0-ux-improvement-plan.md, Фаза 5) — same
// toggle-button-then-form shape as AddStepForm on the process canvas and
// AddTeamMemberForm's roster picker. Trimmed to the fields a PM types most
// often (title/status/quarter/owner, and since фаза 25 плана 2.4 the feature —
// measured as the one link people went to the edit form for); Gantt
// scheduling, the JTBD link, visibility and description stay on the full page
// (still linked below), reached via "Редактировать" on the item this creates.
export function AddRoadmapItemForm({
  productId,
  people,
  features,
}: {
  productId: string
  people: Person[]
  features: Feature[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<RoadmapStatus>(RoadmapStatus.PLANNED)
  const [quarter, setQuarter] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [featureId, setFeatureId] = useState('')
  const [localPeople, setLocalPeople] = useState(people)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function reset() {
    setOpen(false)
    setTitle('')
    setStatus(RoadmapStatus.PLANNED)
    setQuarter('')
    setOwnerId('')
    setFeatureId('')
    setError(null)
  }

  function submit() {
    startTransition(async () => {
      const result = await createRoadmapItemQuick(
        productId,
        title,
        status,
        quarter,
        ownerId,
        featureId
      )
      if (!result.ok) {
        setError(result.error)
        return
      }
      reset()
      router.refresh()
    })
  }

  if (!open) {
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        Добавить пункт
      </Button>
    )
  }

  return (
    <div className="w-full max-w-md space-y-2 rounded-md border bg-background p-3 shadow-sm">
      <Input
        autoFocus
        placeholder="Название"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <Select
          aria-label="Статус"
          value={status}
          onChange={(e) => setStatus(e.target.value as RoadmapStatus)}
        >
          {Object.values(RoadmapStatus).map((s) => (
            <option key={s} value={s}>
              {roadmapStatusLabels[s]}
            </option>
          ))}
        </Select>
        <Input
          placeholder="Квартал, напр. 2026 Q3"
          value={quarter}
          onChange={(e) => setQuarter(e.target.value)}
        />
      </div>
      <Select
        aria-label="Ответственный"
        value={ownerId}
        onChange={(e) => setOwnerId(e.target.value)}
      >
        <option value="">Без ответственного</option>
        {localPeople.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </Select>
      <InlineCreatePerson
        onCreated={(person) => {
          setLocalPeople((prev) => [...prev, person])
          setOwnerId(person.id)
        }}
      />
      {/* Необязательно: пункт роадмапа — не всегда уже существующая фича. */}
      <Select aria-label="Фича" value={featureId} onChange={(e) => setFeatureId(e.target.value)}>
        <option value="">Без фичи</option>
        {features.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </Select>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="button" size="sm" disabled={isPending || !title.trim()} onClick={submit}>
          Добавить
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={reset}>
          Отмена
        </Button>
        <Link
          href={`/pm/roadmap/new?productId=${productId}`}
          className="text-xs text-muted-foreground hover:underline"
        >
          Больше полей →
        </Link>
      </div>
    </div>
  )
}
