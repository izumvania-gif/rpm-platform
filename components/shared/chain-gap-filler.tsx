'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import {
  InlineCreateFeature,
  InlineCreateHypothesis,
  InlineCreateJtbd,
  InlineCreateRTB,
  InlineCreateSegment,
} from '@/components/shared/inline-create'
import {
  chainGapByKind,
  chainGapFullFormHref,
  chainGapItemHref,
  type ChainCandidate,
  type ChainGapKind,
} from '@/lib/chain-gap'
import { chainCandidates, fillChainGap } from '@/lib/actions/chain-link'

// Разрыв цепочки, который чинится на месте (фаза 7 редизайна 2.1).
//
// Раньше пустой слот ленты предлагал только ссылку «+ добавить», и она уводила
// с карточки — на форму создания или в редактирование записи. Проблема видна
// здесь, а решается там; вернувшись, человек уже не помнит, зачем шёл.
//
// Тут оба ответа на «связи нет»: выбрать существующую запись и создать новую.
// Второй — уже готовыми вариантами из inline-create.tsx, а не своей формой:
// вопрос «чего не хватает, чтобы завести запись» на них уже отвечен.
//
// Какие слоты вообще получают эту кнопку, решает lib/chain-gap.ts — только те,
// где до цели ровно одно звено. Кнопка обещает, что после клика разрыва не
// будет, и это обещание должно быть выполнимо.

/** Что показать вместо пустого слота, пока сервер не перерисовал ленту. */
type Filled = { id: string; label: string }

export function ChainGapFiller({
  kind,
  anchorId,
  productId,
  emptyLabel,
}: {
  kind: ChainGapKind
  anchorId: string
  productId: string
  emptyLabel: string
}) {
  const meta = chainGapByKind(kind)
  const router = useRouter()
  const panelRef = useRef<HTMLDivElement>(null)

  const [open, setOpen] = useState(false)
  const [candidates, setCandidates] = useState<ChainCandidate[] | null>(null)
  const [selected, setSelected] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [filled, setFilled] = useState<Filled | null>(null)
  const [isPending, startTransition] = useTransition()

  // Клик мимо закрывает панель. Она перекрывает соседние слоты ленты, и без
  // этого закрыть её можно было бы только повторным нажатием на «связать» —
  // кнопку, которую панель же и загораживает.
  //
  // Список Select живёт в портале у <body>, то есть ВНЕ панели по дереву DOM.
  // Без проверки на попер выбор варианта в селекте считался бы кликом мимо и
  // закрывал панель ровно в тот момент, когда человек выбирает.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (panelRef.current?.contains(target ?? null)) return
      if (target?.closest('[data-radix-popper-content-wrapper]')) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  function openPanel() {
    setOpen(true)
    setError(null)
    if (candidates) return
    startTransition(async () => {
      const result = await chainCandidates(kind, anchorId)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setCandidates(result.candidates)
    })
  }

  /**
   * Одна дорога для обеих кнопок: «Связать» ведёт сюда с выбранным id,
   * инлайн-создание — с только что созданным. Создание и связывание намеренно
   * два вызова, а не один: у каждого createXQuick своя сигнатура, и связь
   * ставится тем же кодом, что и для существующей записи, — значит проверяется
   * теми же тестами.
   */
  function link(targetId: string, label: string) {
    startTransition(async () => {
      const result = await fillChainGap(kind, anchorId, targetId)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setFilled({ id: targetId, label })
      setOpen(false)
      setSelected('')
      // Лента собирается на сервере: обновляем её на месте, без перезагрузки.
      // До того как ответ придёт, слот показывает `filled` — поэтому связь
      // видна сразу, а не через полсекунды.
      router.refresh()
    })
  }

  if (filled) {
    return (
      <Link href={chainGapItemHref(meta.target, filled.id)} className="truncate hover:underline">
        {filled.label}
      </Link>
    )
  }

  return (
    <span className="relative inline-flex items-center gap-1">
      <span className="text-muted-foreground">{emptyLabel}</span>
      <button
        type="button"
        onClick={openPanel}
        aria-label={meta.pickLabel}
        aria-expanded={open}
        className="inline-flex items-center gap-0.5 text-primary underline hover:no-underline"
      >
        <Plus size={11} aria-hidden />
        связать
      </button>

      {open && (
        <div
          ref={panelRef}
          // w-80, а не уже: подпись селекта («Выберите сегмент…») обрезается по
          // словам, и на 18rem от неё оставалось «Выберите…» — плейсхолдер,
          // который перестал говорить, что именно выбирают.
          className="absolute left-0 top-full z-30 mt-1 w-80 space-y-2 rounded-md border bg-background p-2 text-xs shadow-md"
        >
          {candidates === null ? (
            <p className="text-muted-foreground">{error ?? 'Загрузка…'}</p>
          ) : candidates.length === 0 ? (
            <p className="text-muted-foreground">{meta.emptyCandidates}</p>
          ) : (
            <div className="flex items-center gap-2">
              <Select
                aria-label={meta.selectLabel}
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="h-8 min-w-0 flex-1 text-sm"
              >
                <option value="">{meta.placeholder}</option>
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
                onClick={() => {
                  const picked = candidates.find((c) => c.id === selected)
                  if (picked) link(picked.id, picked.label)
                }}
              >
                Связать
              </Button>
            </div>
          )}

          {error && candidates !== null && <p className="text-destructive">{error}</p>}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2">
            <CreateVariant
              kind={kind}
              productId={productId}
              onCreated={(id, label) => link(id, label)}
            />
            <Link
              href={chainGapFullFormHref(meta.target, productId)}
              className="text-muted-foreground hover:underline"
            >
              Все поля →
            </Link>
          </div>
        </div>
      )}
    </span>
  )
}

/**
 * Разводка по типам звена. Явный switch, а не таблица конфигурации: у каждого
 * варианта свой набор обязательных полей (JTBD спрашивает категорию, остальные
 * — нет), и общая форма стёрла бы ровно эту разницу.
 */
function CreateVariant({
  kind,
  productId,
  onCreated,
}: {
  kind: ChainGapKind
  productId: string
  onCreated: (id: string, label: string) => void
}) {
  switch (chainGapByKind(kind).target) {
    case 'segment':
      return (
        <InlineCreateSegment
          productId={productId}
          onCreated={(segment) => onCreated(segment.id, segment.name)}
        />
      )
    case 'jtbd':
      return (
        <InlineCreateJtbd
          productId={productId}
          onCreated={(jtbd) => onCreated(jtbd.id, jtbd.title)}
        />
      )
    case 'feature':
      return (
        <InlineCreateFeature
          productId={productId}
          onCreated={(feature) => onCreated(feature.id, feature.name)}
        />
      )
    case 'hypothesis':
      return (
        <InlineCreateHypothesis
          productId={productId}
          onCreated={(hypothesis) => onCreated(hypothesis.id, hypothesis.statement)}
        />
      )
    case 'rtb':
      return (
        <InlineCreateRTB
          productId={productId}
          onCreated={(rtb) => onCreated(rtb.id, rtb.statement)}
        />
      )
  }
}
