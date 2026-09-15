'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { InlineCreateHypothesis, InlineCreateJtbd } from '@/components/shared/inline-create'
import type { ChainCandidate } from '@/lib/chain-gap'
import {
  attachToResearch,
  researchLinkCandidates,
  type ResearchLinkKind,
} from '@/lib/actions/research-links'

// «+ Привязать …» на карточке исследования (фаза 26 плана 2.4, F6).
//
// Тот же паттерн, что у пикера доказательств на карточке гипотезы: выбрать
// существующую запись продукта или создать новую — и одно действие ставит
// связь. Три вида в одном компоненте, потому что различаются они только
// подписями и тем, что предлагать вместо «создать»: у задачи и гипотезы есть
// инлайн-создание (категория и формулировка спрашиваются, как везде), а
// разговор — не запись на одно поле, поэтому вместо создания на месте —
// ссылка на полную форму с уже проставленным исследованием.

const COPY: Record<
  ResearchLinkKind,
  { trigger: string; select: string; empty: string; newLabel: string }
> = {
  jtbd: {
    trigger: '+ Привязать задачу',
    select: 'Задача',
    empty: 'Свободных задач у продукта нет — все уже опираются на исследование.',
    newLabel: 'Новая задача',
  },
  hypothesis: {
    trigger: '+ Привязать гипотезу',
    select: 'Гипотеза',
    empty: 'Свободных гипотез у продукта нет — все уже опираются на исследование.',
    newLabel: 'Новая гипотеза',
  },
  conversation: {
    trigger: '+ Привязать разговор',
    select: 'Разговор',
    empty: 'Свободных разговоров у продукта нет — все уже привязаны к исследованию.',
    newLabel: 'Новый разговор',
  },
}

export function ResearchLinkPicker({
  researchId,
  productId,
  kind,
  fullFormHref,
}: {
  researchId: string
  productId: string
  kind: ResearchLinkKind
  /** Полная форма новой записи с уже проставленным исследованием. */
  fullFormHref: string
}) {
  const router = useRouter()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const copy = COPY[kind]

  const [open, setOpen] = useState(false)
  const [candidates, setCandidates] = useState<ChainCandidate[] | null>(null)
  const [selected, setSelected] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function openPanel() {
    setOpen(true)
    setError(null)
    // Список берётся заново при каждом открытии: после привязки он уже другой.
    setCandidates(null)
    startTransition(async () => {
      const result = await researchLinkCandidates(researchId, kind)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setCandidates(result.candidates)
    })
  }

  function close() {
    setOpen(false)
    setSelected('')
    setError(null)
    triggerRef.current?.focus()
  }

  /** Одна дорога для выбранной и для только что созданной записи. */
  function attach(recordId: string) {
    startTransition(async () => {
      const result = await attachToResearch(researchId, kind, recordId)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setOpen(false)
      setSelected('')
      // Секция, «Пробелы» и матрица считаются на сервере.
      router.refresh()
    })
  }

  return (
    <div className="space-y-2">
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        size="sm"
        aria-expanded={open}
        onClick={() => (open ? close() : openPanel())}
      >
        {copy.trigger}
      </Button>

      {open && (
        <div
          role="group"
          aria-label={copy.trigger.slice(2)}
          className="space-y-2 rounded-md border p-3 text-xs"
          onKeyDown={(event) => {
            if (event.key === 'Escape') close()
          }}
        >
          {candidates === null ? (
            <p className="text-muted-foreground">{error ?? 'Загрузка…'}</p>
          ) : candidates.length === 0 ? (
            <p className="text-muted-foreground">{copy.empty}</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Select
                aria-label={copy.select}
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="h-8 w-72 min-w-0 text-sm"
              >
                <option value="">Выберите…</option>
                {candidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id} title={candidate.fullLabel}>
                    {candidate.label}
                  </option>
                ))}
              </Select>
              <Button
                type="button"
                size="sm"
                disabled={isPending || selected === ''}
                onClick={() => attach(selected)}
              >
                Привязать
              </Button>
            </div>
          )}

          {error && candidates !== null && <p className="text-destructive">{error}</p>}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2">
            {kind === 'jtbd' && (
              <InlineCreateJtbd productId={productId} onCreated={(jtbd) => attach(jtbd.id)} />
            )}
            {kind === 'hypothesis' && (
              <InlineCreateHypothesis
                productId={productId}
                onCreated={(hypothesis) => attach(hypothesis.id)}
              />
            )}
            {kind === 'conversation' && (
              <Link href={fullFormHref} className="text-primary hover:underline">
                {copy.newLabel} →
              </Link>
            )}
            <div className="flex items-center gap-3">
              {kind !== 'conversation' && (
                <Link href={fullFormHref} className="text-muted-foreground hover:underline">
                  Все поля →
                </Link>
              )}
              <button
                type="button"
                className="text-muted-foreground hover:underline"
                onClick={close}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
