'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import type { JtbdJobType } from '@prisma/client'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { TagBadges } from '@/components/shared/tag-badges'
import { JobTypeBadge } from '@/components/shared/job-type-badge'
import { toTagsArray } from '@/lib/validation'
import { cn } from '@/lib/utils'

export interface InlineEditableOption {
  value: string
  label: string
}

export type InlineEditableType = 'text' | 'textarea' | 'date' | 'number' | 'select'

// How the saved value renders in view mode. Server Components can't pass
// render functions into a Client Component, so display customization is data
// (labels/variants), not a render prop — this component owns the presentation.
export type InlineEditableDisplay = 'text' | 'tags' | 'date' | 'badge' | 'jobType' | 'link'

type BadgeVariant = 'default' | 'secondary' | 'outline'

// Click-to-edit-in-place primitive for detail-page scalar fields — no navigation
// to the full edit form, no modal. See plans/growth-plan.md §2.9.5. Relation
// fields (segments, linked features, etc.) are out of scope here; they already
// have a working multi-select on the full edit form.
export function InlineEditableField({
  value,
  type = 'text',
  options,
  action,
  placeholder = '+ добавить',
  display = 'text',
  labels,
  badgeVariant = 'secondary',
  prefix = '',
  suffix = '',
  className,
}: {
  value: string
  type?: InlineEditableType
  options?: InlineEditableOption[]
  action: (value: string) => Promise<{ ok: boolean; error?: string }>
  placeholder?: string
  display?: InlineEditableDisplay
  labels?: Record<string, string>
  badgeVariant?: BadgeVariant | Record<string, BadgeVariant>
  prefix?: string
  suffix?: string
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(value)
  const [draft, setDraft] = useState(value)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // Targets the visible Radix trigger button (components/ui/select.tsx forwards
  // its ref there, not to the hidden native <select> used for form submission)
  // so entering edit mode moves keyboard focus somewhere the user can act on.
  const selectRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!editing) return
    ;(inputRef.current ?? textareaRef.current ?? selectRef.current)?.focus()
  }, [editing])

  function startEdit() {
    setDraft(saved)
    setError(null)
    setEditing(true)
  }

  function cancel() {
    setDraft(saved)
    setError(null)
    setEditing(false)
  }

  function save(nextValue: string) {
    startTransition(async () => {
      const result = await action(nextValue)
      if (!result.ok) {
        setError(result.error ?? 'Не удалось сохранить')
        return
      }
      setSaved(nextValue)
      setDraft(nextValue)
      setError(null)
      setEditing(false)
    })
  }

  function renderDisplay() {
    switch (display) {
      case 'tags':
        return <TagBadges tags={toTagsArray(saved)} />
      case 'date':
        return new Date(saved).toLocaleDateString('ru-RU')
      case 'badge': {
        const variant =
          typeof badgeVariant === 'string' ? badgeVariant : (badgeVariant[saved] ?? 'secondary')
        return <Badge variant={variant}>{labels?.[saved] ?? saved}</Badge>
      }
      case 'jobType':
        return <JobTypeBadge jobType={saved as JtbdJobType} />
      case 'link':
        return (
          <a href={saved} target="_blank" rel="noreferrer" className="hover:underline">
            {saved}
          </a>
        )
      default:
        return `${prefix}${labels?.[saved] ?? saved}${suffix}`
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={startEdit}
        title="Нажмите, чтобы отредактировать"
        className={cn(
          'rounded px-1 -mx-1 text-left transition-colors hover:bg-accent/60',
          !saved && 'italic text-muted-foreground',
          className
        )}
      >
        {saved ? renderDisplay() : placeholder}
      </button>
    )
  }

  if (type === 'select') {
    return (
      <span className="inline-flex flex-col gap-1 align-top">
        <Select
          ref={selectRef}
          value={draft}
          disabled={isPending}
          className="h-9 w-auto"
          onChange={(e) => {
            setDraft(e.target.value)
            save(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') cancel()
          }}
        >
          {options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </span>
    )
  }

  if (type === 'date') {
    return (
      <span className="inline-flex flex-col gap-1 align-top">
        <Input
          ref={inputRef}
          type="date"
          value={draft}
          disabled={isPending}
          className="h-9 w-auto"
          onChange={(e) => {
            setDraft(e.target.value)
            save(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') cancel()
          }}
        />
        {error && <span className="text-xs text-destructive">{error}</span>}
      </span>
    )
  }

  if (type === 'textarea') {
    return (
      <span className="flex flex-col gap-1">
        <Textarea
          ref={textareaRef}
          value={draft}
          disabled={isPending}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => save(draft)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') cancel()
          }}
          rows={3}
        />
        <span className="text-xs text-muted-foreground">
          Esc — отмена, клик вне поля — сохранить
        </span>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </span>
    )
  }

  return (
    <span className="inline-flex flex-col gap-1 align-top">
      <Input
        ref={inputRef}
        type={type === 'number' ? 'number' : 'text'}
        value={draft}
        disabled={isPending}
        className="h-9 w-auto min-w-[12rem]"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => save(draft)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            save(draft)
          }
          if (e.key === 'Escape') cancel()
        }}
      />
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  )
}
