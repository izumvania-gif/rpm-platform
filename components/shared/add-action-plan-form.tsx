'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Person } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { createActionPlanQuick } from '@/lib/actions/action-plans'
import { InlineCreatePerson } from '@/components/shared/inline-create'

// Inline "Добавить план" (plans/2.0-ux-improvement-plan.md, Фаза 5) — same
// toggle-button-then-form shape as AddRoadmapItemForm. Keeps steps (the
// actual point of an action plan) inline; processStepId/tags stay on the
// full page, reachable via "Больше полей →" or "Редактировать" afterward.
export function AddActionPlanForm({ productId, people }: { productId: string; people: Person[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [scenario, setScenario] = useState('')
  const [trigger, setTrigger] = useState('')
  const [steps, setSteps] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [localPeople, setLocalPeople] = useState(people)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function reset() {
    setOpen(false)
    setScenario('')
    setTrigger('')
    setSteps('')
    setOwnerId('')
    setError(null)
  }

  function submit() {
    startTransition(async () => {
      const result = await createActionPlanQuick(productId, scenario, trigger, steps, ownerId)
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
        Добавить план
      </Button>
    )
  }

  return (
    <div className="w-full max-w-md space-y-2 rounded-md border bg-background p-3 shadow-sm">
      <Input
        autoFocus
        placeholder="Сценарий, напр. Клиент публично жалуется в соцсетях"
        value={scenario}
        onChange={(e) => setScenario(e.target.value)}
      />
      <Input
        placeholder="Как понять, что сценарий наступил (необязательно)"
        value={trigger}
        onChange={(e) => setTrigger(e.target.value)}
      />
      <Textarea
        rows={3}
        placeholder={'Шаги, по одному на строку\nОценить масштаб\nСвязаться с клиентом'}
        value={steps}
        onChange={(e) => setSteps(e.target.value)}
      />
      <Select
        aria-label="Кто координирует"
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

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="button" size="sm" disabled={isPending || !scenario.trim()} onClick={submit}>
          Добавить
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={reset}>
          Отмена
        </Button>
        <Link
          href={`/pm/action-plans/new?productId=${productId}`}
          className="text-xs text-muted-foreground hover:underline"
        >
          Больше полей →
        </Link>
      </div>
    </div>
  )
}
