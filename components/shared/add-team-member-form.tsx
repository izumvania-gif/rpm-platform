'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Person } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  addProductTeamMemberQuick,
  createPersonAndAddToTeamQuick,
} from '@/lib/actions/product-team'

// Inline roster picker for /pm's Команда section (plans/2.0-ux-improvement-plan.md,
// Фаза 2) — same toggle-button-then-form shape as AddStepForm on the process
// canvas. Two ways to add someone (existing pick or create-on-the-spot),
// matching the "Person deliberately has no inline-create yet, add it when a
// real picker needs it" note this roster is the real picker for.
export function AddTeamMemberForm({
  productId,
  people,
  existingPersonIds,
}: {
  productId: string
  people: Person[]
  existingPersonIds: string[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [personId, setPersonId] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const availablePeople = people.filter((p) => !existingPersonIds.includes(p.id))

  function reset() {
    setOpen(false)
    setMode('existing')
    setPersonId('')
    setName('')
    setRole('')
    setError(null)
  }

  function submit() {
    startTransition(async () => {
      const result =
        mode === 'existing'
          ? await addProductTeamMemberQuick(productId, personId)
          : await createPersonAndAddToTeamQuick(productId, name, role)
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
        + Добавить в команду
      </Button>
    )
  }

  const canSubmit = mode === 'existing' ? !!personId : !!name.trim()

  return (
    <div className="w-full max-w-sm space-y-2 rounded-md border bg-background p-3 shadow-sm">
      <div className="inline-flex rounded-md border p-0.5 text-xs">
        {(['existing', 'new'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              'rounded px-2.5 py-1 font-medium transition-colors',
              mode === m
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {m === 'existing' ? 'Существующий' : 'Новый человек'}
          </button>
        ))}
      </div>

      {mode === 'existing' ? (
        availablePeople.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Все люди из /people уже в команде этого продукта — можно создать нового.
          </p>
        ) : (
          <Select
            aria-label="Человек"
            value={personId}
            onChange={(e) => setPersonId(e.target.value)}
          >
            <option value="">Выберите человека</option>
            {availablePeople.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        )
      ) : (
        <>
          <Input
            autoFocus
            placeholder="Имя"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="Роль (необязательно)"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={isPending || !canSubmit} onClick={submit}>
          Добавить
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={reset}>
          Отмена
        </Button>
      </div>
    </div>
  )
}
