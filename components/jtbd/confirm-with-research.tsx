'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { InlineCreateResearch } from '@/components/shared/inline-create'
import { CONFIRM_RESEARCH_HASH } from '@/lib/record-blockers'
import type { ChainCandidate } from '@/lib/chain-gap'
import { confirmJtbdWithResearch, confirmResearchCandidates } from '@/lib/actions/jtbd-confirm'

// «Подтвердить исследованием» — пикер, а не форма (фаза 25 плана 2.4).
//
// До этого подтвердить задачу значило открыть форму редактирования, выбрать
// исследование и поставить галочку — два поля ради одного намерения, и
// переход туда-обратно с карточки или из очереди «Пробелов». Здесь тот же
// паттерн, что у пикера доказательств: выбрать существующее исследование или
// создать новое (InlineCreateResearch спрашивает тип, как и везде), и одно
// действие ставит и связь, и флаг. Кнопки «подтвердить без исследования» нет —
// «Подтвердить» неактивна, пока исследование не выбрано.
//
// Один компонент на два места: карточка задачи (с открытием по якорю из блока
// «Что мешает») и строка очереди «Пробелов» (без якоря — строк много, и все бы
// открылись разом).

export function ConfirmWithResearch({
  jtbdId,
  productId,
  currentResearchId,
  fullFormHref,
  hashOpens = false,
  compact = false,
}: {
  jtbdId: string
  productId: string
  /** Уже привязанное исследование — подставляется, чтобы флаг ставился одним нажатием. */
  currentResearchId?: string | null
  /** Форма редактирования — для всего, чего пикер не спрашивает. */
  fullFormHref?: string
  /** Открываться по `#confirm-research` — только на карточке задачи. */
  hashOpens?: boolean
  /** Строка очереди: без создания и без «Все поля →», только выбор и кнопка. */
  compact?: boolean
}) {
  const router = useRouter()
  const triggerRef = useRef<HTMLButtonElement>(null)

  const [open, setOpen] = useState(false)
  const [candidates, setCandidates] = useState<ChainCandidate[] | null>(null)
  const [selected, setSelected] = useState(currentResearchId ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function openPanel() {
    setOpen(true)
    setError(null)
    setCandidates(null)
    startTransition(async () => {
      const result = await confirmResearchCandidates(jtbdId)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setCandidates(result.candidates)
    })
  }

  function close() {
    setOpen(false)
    setSelected(currentResearchId ?? '')
    setError(null)
    triggerRef.current?.focus()
  }

  // Якорь из блока «Что мешает»: и прямой переход по адресу (`hashchange`),
  // и клик по <Link href="#…">, который идёт через pushState и `hashchange`
  // не поднимает — тот же урок, что у пикера доказательств.
  useEffect(() => {
    if (!hashOpens) return
    const onHash = () => {
      if (window.location.hash === CONFIRM_RESEARCH_HASH) openPanel()
    }
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest('a')
      if (anchor && anchor.getAttribute('href') === CONFIRM_RESEARCH_HASH) openPanel()
    }
    onHash()
    window.addEventListener('hashchange', onHash)
    document.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('hashchange', onHash)
      document.removeEventListener('click', onClick)
    }
    // openPanel замыкает только сеттеры и jtbdId — стабильные значения.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hashOpens])

  /** Одна дорога для выбранного и для только что созданного исследования. */
  function confirm(researchId: string) {
    startTransition(async () => {
      const result = await confirmJtbdWithResearch(jtbdId, researchId)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setOpen(false)
      // Флаг, блокер, очередь и матрица считаются на сервере.
      router.refresh()
    })
  }

  return (
    <div
      id={hashOpens ? CONFIRM_RESEARCH_HASH.slice(1) : undefined}
      // На карточке пикер стоит в строке чипов; открытый — занимает всю строку,
      // чтобы селект и создание исследования не тянули чипы за собой.
      className={cn('space-y-2', !compact && 'scroll-mt-24', !compact && open && 'basis-full')}
    >
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        size="sm"
        aria-expanded={open}
        onClick={() => (open ? close() : openPanel())}
      >
        Подтвердить исследованием
      </Button>

      {open && (
        <div
          role="group"
          aria-label="Подтвердить исследованием"
          className="space-y-2 rounded-md border bg-background p-3 text-xs"
          onKeyDown={(event) => {
            if (event.key === 'Escape') close()
          }}
        >
          {candidates === null ? (
            <p className="text-muted-foreground">{error ?? 'Загрузка…'}</p>
          ) : candidates.length === 0 ? (
            <p className="text-muted-foreground">
              У продукта пока нет исследований.{' '}
              {compact ? (
                <Link
                  href={`/research/new?productId=${productId}`}
                  className="text-primary hover:underline"
                >
                  Запланировать исследование →
                </Link>
              ) : (
                'Создайте первое ниже.'
              )}
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Select
                aria-label="Исследование"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="h-8 w-72 min-w-0 text-sm"
              >
                <option value="">Выберите исследование…</option>
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
                onClick={() => confirm(selected)}
              >
                Подтвердить
              </Button>
            </div>
          )}

          {error && candidates !== null && <p className="text-destructive">{error}</p>}

          {!compact && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2">
              <InlineCreateResearch
                productId={productId}
                onCreated={(research) => confirm(research.id)}
              />
              <div className="flex items-center gap-3">
                {fullFormHref && (
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
          )}
          {compact && (
            <button type="button" className="text-muted-foreground hover:underline" onClick={close}>
              Отмена
            </button>
          )}
        </div>
      )}
    </div>
  )
}
