'use client'

import { useState, useTransition } from 'react'
import type { Person } from '@prisma/client'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  addProductTeamMemberQuick,
  createPersonAndAddToTeamQuick,
} from '@/lib/actions/product-team'
import { cn } from '@/lib/utils'
import { WizardEntryList } from './wizard-entry-list'

type TeamMemberEntry = { id: string; person: Person }

// Adds people to the ProductTeamMember roster (plans/2.0-ux-improvement-plan.md,
// раздел C) — reuses the same two Quick actions the /pm roster form uses
// (Фаза 2), just appended to local state here instead of router.refresh(),
// matching every other onboarding step's stay-on-page pattern.
export function PeopleStepForm({
  productId,
  people,
  initialMembers,
}: {
  productId: string
  people: Person[]
  initialMembers: TeamMemberEntry[]
}) {
  const [members, setMembers] = useState(initialMembers)
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [personId, setPersonId] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const availablePeople = people.filter((p) => !members.some((m) => m.person.id === p.id))

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
      setMembers((prev) => [...prev, result.member])
      setPersonId('')
      setName('')
      setRole('')
      setError(null)
    })
  }

  const canSubmit = mode === 'existing' ? !!personId : !!name.trim()

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-md border p-3">
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
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input placeholder="Имя" value={name} onChange={(e) => setName(e.target.value)} />
            <Input
              placeholder="Роль (необязательно)"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="button" disabled={isPending || !canSubmit} onClick={submit}>
          Добавить
        </Button>
      </div>

      <WizardEntryList
        items={members.map((m) => ({
          id: m.id,
          label: m.person.name,
          meta: m.person.role ?? undefined,
        }))}
        emptyLabel="В команде пока никого нет — добавьте первого человека выше."
      />
    </div>
  )
}
