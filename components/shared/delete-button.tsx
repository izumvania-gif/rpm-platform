'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Link2Off, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SubmitButton } from '@/components/shared/submit-button'
import { getDeleteImpact } from '@/lib/actions/delete-impact'
import { formatImpactCount, type DeleteImpact } from '@/lib/delete-impact'
import type { OwnedModel } from '@/lib/ownership'

// Delete confirmation (plans/2.0-hardening-plan.md, B4).
//
// This used to be `confirm('Удалить безвозвратно?')` — one line, no numbers,
// no undo, in front of a schema with 38 cascade relations where one seeded
// product takes 41 child records with it. The fix is not undo (a separate,
// much bigger feature, see the plan's "что намеренно не предлагается") but
// honesty: count the dependants first and show them before the button.
//
// `impact` is optional so a call site with genuinely nothing hanging off the
// record can skip the query, but every current one passes it — an empty
// result is worth showing too («Связанных записей нет» is information).

export type ImpactTarget = { model: OwnedModel; id: string }

/** Long free text (a hypothesis statement, an insight) would push the buttons off. */
const MAX_NAME = 120

export function DeleteButton({
  action,
  confirmMessage = 'Удалить безвозвратно?',
  impact,
  name,
  label = 'Удалить',
}: {
  action: () => void
  confirmMessage?: string
  impact?: ImpactTarget
  /** Shown in the dialog so it is obvious *which* record is about to go. */
  name?: string
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant="destructive"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        {label}
      </Button>
      {open && (
        <ConfirmDeleteDialog
          action={action}
          confirmMessage={confirmMessage}
          impact={impact}
          name={name}
          label={label}
          onClose={() => {
            setOpen(false)
            triggerRef.current?.focus()
          }}
        />
      )}
    </>
  )
}

/**
 * The dialog on its own, for a delete that is not a form submit.
 *
 * The process canvas deletes a step through a client callback + router
 * refresh (it must stay on the canvas), so it cannot use DeleteButton — but
 * it hides exactly the same thing, a cascade of edges, and deserves the same
 * count. Pass `action` for a Server Action, or `onConfirm` for a callback.
 */
export function ConfirmDeleteDialog({
  action,
  onConfirm,
  confirmMessage,
  impact,
  name,
  label = 'Удалить',
  onClose,
}: {
  action?: () => void
  onConfirm?: () => void
  confirmMessage: string
  impact?: ImpactTarget
  name?: string
  label?: string
  onClose: () => void
}) {
  const [counts, setCounts] = useState<DeleteImpact | null>(null)
  const [error, setError] = useState<string | null>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const model = impact?.model
  const id = impact?.id

  useEffect(() => {
    if (!model || !id) return
    let active = true
    getDeleteImpact(model, id)
      .then((res) => {
        if (!active) return
        if (res.ok) setCounts(res.impact)
        else setError(res.error)
      })
      // The count is advisory; a failure must not block a delete the user
      // already decided on — it only stops us claiming a number we don't have.
      .catch(() => active && setError('Не удалось посчитать связанные записи'))
    return () => {
      active = false
    }
  }, [model, id])

  const loading = Boolean(model) && counts === null && error === null
  const nothingLinked = counts !== null && !counts.deleted.length && !counts.unlinked.length
  const shortName = name && name.length > MAX_NAME ? `${name.slice(0, MAX_NAME)}...` : name

  // Portalled to <body>: a delete button can sit inside a transformed
  // ancestor (an animating card, the React Flow canvas), and a transformed
  // ancestor makes `position: fixed` resolve against it, not the viewport.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-background/60 p-4 pt-24 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={confirmMessage}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-lg border bg-card p-5 shadow-lg motion-safe:animate-card-settle"
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-base font-bold">
            <AlertTriangle size={16} aria-hidden className="shrink-0 text-destructive" />
            {confirmMessage}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        {shortName && (
          <p className="mb-3 break-words text-sm text-muted-foreground">«{shortName}»</p>
        )}

        <div className="mb-4 space-y-3 text-sm">
          {loading && <p className="text-muted-foreground">Считаем связанные записи...</p>}

          {error && <p className="text-destructive">{error}</p>}

          {nothingLinked && <p className="text-muted-foreground">Связанных записей нет.</p>}

          {counts !== null && counts.deleted.length > 0 && (
            <div>
              <p className="mb-1 flex items-center gap-1.5 font-medium">
                <Trash2 size={14} aria-hidden className="text-destructive" />
                Будет удалено вместе с этой записью:
              </p>
              <ul className="ml-1 space-y-0.5 text-muted-foreground">
                {counts.deleted.map((c) => (
                  <li key={c.key}>— {formatImpactCount(c)}</li>
                ))}
              </ul>
            </div>
          )}

          {counts !== null && counts.unlinked.length > 0 && (
            <div>
              <p className="mb-1 flex items-center gap-1.5 font-medium">
                <Link2Off size={14} aria-hidden className="text-muted-foreground" />
                Останется, но потеряет связь:
              </p>
              <ul className="ml-1 space-y-0.5 text-muted-foreground">
                {counts.unlinked.map((c) => (
                  <li key={c.key}>— {formatImpactCount(c)}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-muted-foreground">Действие нельзя отменить.</p>
        </div>

        <div className="flex justify-end gap-2">
          <Button ref={cancelRef} type="button" variant="outline" onClick={onClose}>
            Отмена
          </Button>
          {action ? (
            <form action={action}>
              <SubmitButton variant="destructive" pendingText="Удаление...">
                {label}
              </SubmitButton>
            </form>
          ) : (
            <Button type="button" variant="destructive" onClick={onConfirm}>
              {label}
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
