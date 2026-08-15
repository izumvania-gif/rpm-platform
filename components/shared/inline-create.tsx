'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { ResearchType, type JTBD, type Person, type Research, type Segment } from '@prisma/client'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { typeLabels } from '@/lib/labels'
import { createSegmentQuick } from '@/lib/actions/segments'
import { createResearchQuick } from '@/lib/actions/research'
import { createJtbdQuick } from '@/lib/actions/jtbd-graph'
import { createPersonQuick } from '@/lib/actions/people'

// "+ Новый …" inside a relation picker (plans/2.0-round-trip-audit.md).
//
// A picker over records that already exist has no answer for the case that
// matters most while filling a form: the record you need is not in the list.
// Leaving to create it means abandoning a half-typed form — these are plain
// server-rendered forms, nothing is kept — so the cost is not one extra click,
// it is retyping everything.
//
// Only relations whose required shape fits in one or two fields are here.
// Разговор (a transcript) and Продукт (its whole identity) stay out for the
// same reason the quick-capture modal refuses them.

/**
 * The open/closed shell, the pending state and the error line — everything
 * every variant shares. The variants below own their fields and their action,
 * because each createXQuick has its own signature and flattening them to a
 * common shape would erase exactly the argument checking that makes a required
 * field impossible to forget.
 */
function InlineCreateShell({
  label,
  submitLabel,
  disabled,
  canSubmit,
  onSubmit,
  onReset,
  children,
}: {
  label: string
  /**
   * Names what gets created, never a bare «Создать»: this sits inside a form
   * whose own submit button is also «Создать», and two buttons with the same
   * accessible name doing different things is exactly the ambiguity a screen
   * reader cannot resolve.
   */
  submitLabel: string
  disabled?: boolean
  canSubmit: boolean
  onSubmit: () => Promise<string | null>
  onReset: () => void
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function close() {
    setOpen(false)
    setError(null)
    onReset()
  }

  if (!open) {
    return (
      <button
        type="button"
        className="text-xs text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {label}
      </button>
    )
  }

  function submit() {
    if (!canSubmit) return
    startTransition(async () => {
      const message = await onSubmit()
      if (message) {
        setError(message)
        return
      }
      close()
    })
  }

  return (
    <div className="mt-1 space-y-1">
      <div
        className="flex flex-wrap items-center gap-2"
        // Enter must not submit the form this sits inside — that would save a
        // half-filled record and navigate away, the exact thing this exists to
        // prevent. It commits the inline create instead.
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return
          event.preventDefault()
          submit()
        }}
      >
        {children}
        <Button type="button" size="sm" disabled={isPending || !canSubmit} onClick={submit}>
          {submitLabel}
        </Button>
        <button
          type="button"
          className="text-xs text-muted-foreground hover:underline"
          onClick={close}
        >
          Отмена
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export function InlineCreateSegment({
  productId,
  onCreated,
}: {
  productId: string
  onCreated: (segment: Segment) => void
}) {
  const [name, setName] = useState('')

  return (
    <InlineCreateShell
      label="+ Новый сегмент"
      submitLabel="Создать сегмент"
      disabled={!productId}
      canSubmit={name.trim() !== ''}
      onReset={() => setName('')}
      onSubmit={async () => {
        const result = await createSegmentQuick(productId, name)
        if (!result.ok) return result.error
        onCreated(result.segment)
        return null
      }}
    >
      <Input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Название сегмента"
        className="h-8 w-56 text-sm"
      />
    </InlineCreateShell>
  )
}

export function InlineCreateResearch({
  productId,
  onCreated,
}: {
  productId: string
  onCreated: (research: Research) => void
}) {
  const [title, setTitle] = useState('')
  // Asked rather than defaulted: the type drives the research cadence report
  // and the «давно не обновлялось» marks, so a silent QUALITATIVE would be a
  // claim about the study that nobody made.
  const [type, setType] = useState<ResearchType | ''>('')

  return (
    <InlineCreateShell
      label="+ Новое исследование"
      submitLabel="Создать исследование"
      disabled={!productId}
      canSubmit={title.trim() !== '' && type !== ''}
      onReset={() => {
        setTitle('')
        setType('')
      }}
      onSubmit={async () => {
        const result = await createResearchQuick(productId, title, type as ResearchType)
        if (!result.ok) return result.error
        onCreated(result.research)
        return null
      }}
    >
      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Название исследования"
        className="h-8 w-56 text-sm"
      />
      <Select
        aria-label="Тип исследования"
        value={type}
        onChange={(e) => setType(e.target.value as ResearchType | '')}
        className="h-8 w-48 text-sm"
      >
        <option value="">Тип…</option>
        {Object.values(ResearchType).map((value) => (
          <option key={value} value={value}>
            {typeLabels[value]}
          </option>
        ))}
      </Select>
    </InlineCreateShell>
  )
}

export function InlineCreateJtbd({
  productId,
  onCreated,
}: {
  productId: string
  onCreated: (jtbd: JTBD) => void
}) {
  const [title, setTitle] = useState('')
  // Same rule as everywhere else JTBD is created outside its own form: the
  // category is required by the model and feeds the coverage and gaps
  // reports, so it is asked; the job type stays at the schema's SMALL_JOB.
  const [category, setCategory] = useState('')

  return (
    <InlineCreateShell
      label="+ Новый JTBD"
      submitLabel="Создать JTBD"
      disabled={!productId}
      canSubmit={title.trim() !== '' && category.trim() !== ''}
      onReset={() => {
        setTitle('')
        setCategory('')
      }}
      onSubmit={async () => {
        const result = await createJtbdQuick(productId, title, category, 'SMALL_JOB')
        if (!result.ok) return result.error
        onCreated(result.jtbd)
        return null
      }}
    >
      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Когда …, я хочу …, чтобы …"
        className="h-8 w-64 text-sm"
      />
      <Input
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="Категория"
        className="h-8 w-40 text-sm"
        aria-label="Категория JTBD"
      />
    </InlineCreateShell>
  )
}

export function InlineCreatePerson({ onCreated }: { onCreated: (person: Person) => void }) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')

  return (
    // No productId: Person is scoped to the user, not to a product, which is
    // why this one also works on the create-product form.
    <InlineCreateShell
      label="+ Новый человек"
      submitLabel="Создать человека"
      canSubmit={name.trim() !== ''}
      onReset={() => {
        setName('')
        setRole('')
      }}
      onSubmit={async () => {
        const result = await createPersonQuick(name, role)
        if (!result.ok) return result.error
        onCreated(result.person)
        return null
      }}
    >
      <Input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Имя"
        className="h-8 w-48 text-sm"
      />
      <Input
        value={role}
        onChange={(e) => setRole(e.target.value)}
        placeholder="Роль (необязательно)"
        className="h-8 w-48 text-sm"
        aria-label="Роль"
      />
    </InlineCreateShell>
  )
}
