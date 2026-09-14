'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { InsightStance } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { InlineCreateInsight } from '@/components/shared/inline-create'
import { insightStanceLabels } from '@/lib/labels'
import type { ChainCandidate } from '@/lib/chain-gap'
import { ADD_EVIDENCE_HASH } from '@/lib/hypothesis-readiness'
import { attachEvidence, evidenceCandidates } from '@/lib/actions/evidence'

// «+ Добавить доказательство» на карточке гипотезы (фаза 21 аудита 2.3).
//
// Кнопка вела на полную форму инсайта, даже когда нужная цитата уже записана
// из разговора и её надо просто привязать. Теперь здесь оба ответа на «нет
// доказательства»: выбрать существующий инсайт продукта и создать новый — тот
// же паттерн, что у chain-gap-filler, только панель стоит в потоке карточки,
// а не поверх соседей: в секции «Доказательства» места хватает, и закрывать её
// кликом мимо незачем.
//
// Сторона спрашивается здесь же, но не требуется: инсайт вправе быть
// наблюдением без стороны (фаза 2 схемы), а выдуманный голос испортил бы
// баланс.

export function EvidencePicker({
  hypothesisId,
  productId,
  fullFormHref,
}: {
  hypothesisId: string
  productId: string
  /** Полная форма инсайта с уже проставленной гипотезой. */
  fullFormHref: string
}) {
  const router = useRouter()
  const triggerRef = useRef<HTMLButtonElement>(null)

  const [open, setOpen] = useState(false)
  const [candidates, setCandidates] = useState<ChainCandidate[] | null>(null)
  const [selected, setSelected] = useState('')
  const [stance, setStance] = useState<InsightStance | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function load() {
    startTransition(async () => {
      const result = await evidenceCandidates(hypothesisId)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setCandidates(result.candidates)
    })
  }

  function openPanel() {
    setOpen(true)
    setError(null)
    // Список берётся заново при каждом открытии: после привязки он уже другой.
    setCandidates(null)
    load()
  }

  function close() {
    setOpen(false)
    setSelected('')
    setStance('')
    setError(null)
    triggerRef.current?.focus()
  }

  // «К доказательствам» в чек-листе готовности — якорь сюда. Пустой список
  // доказательств не подсказывает, что делать; открытая панель — подсказывает.
  //
  // Два слушателя, а не один: `hashchange` ловит прямой переход по адресу с
  // якорем, но клик по <Link href="#add-evidence"> внутри страницы идёт через
  // pushState роутера Next, а pushState событие `hashchange` не поднимает —
  // это и поймал E2E. Поэтому клик по любой ссылке на этот якорь слушается
  // отдельно, на документе.
  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === ADD_EVIDENCE_HASH) openPanel()
    }
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest('a')
      if (anchor && anchor.getAttribute('href') === ADD_EVIDENCE_HASH) openPanel()
    }
    onHash()
    window.addEventListener('hashchange', onHash)
    document.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('hashchange', onHash)
      document.removeEventListener('click', onClick)
    }
    // openPanel замыкает только сеттеры и hypothesisId — стабильные значения.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Одна дорога для обеих кнопок: «Привязать» ведёт сюда с выбранным id,
   * инлайн-создание — с только что созданным. Связь ставится одним кодом.
   */
  function attach(insightId: string) {
    startTransition(async () => {
      const result = await attachEvidence(hypothesisId, insightId, stance === '' ? null : stance)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setOpen(false)
      setSelected('')
      setStance('')
      // Баланс, список и чек-лист считаются на сервере — перерисовать на месте.
      router.refresh()
    })
  }

  return (
    <div id={ADD_EVIDENCE_HASH.slice(1)} className="scroll-mt-24 space-y-2">
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        size="sm"
        aria-expanded={open}
        onClick={() => (open ? close() : openPanel())}
      >
        + Добавить доказательство
      </Button>

      {open && (
        <div
          role="group"
          aria-label="Добавить доказательство"
          className="space-y-2 rounded-md border p-3 text-xs"
          onKeyDown={(event) => {
            if (event.key === 'Escape') close()
          }}
        >
          {candidates === null ? (
            <p className="text-muted-foreground">{error ?? 'Загрузка…'}</p>
          ) : candidates.length === 0 ? (
            <p className="text-muted-foreground">
              Свободных инсайтов у продукта нет — все уже привязаны к гипотезам. Создайте новый
              ниже.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Select
                aria-label="Инсайт"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="h-8 w-72 min-w-0 text-sm"
              >
                <option value="">Выберите инсайт…</option>
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

          {/* Сторона — общая для обоих путей: и для выбранного, и для нового. */}
          <div className="flex flex-wrap items-center gap-2">
            <Select
              aria-label="Сторона доказательства"
              value={stance}
              onChange={(e) => setStance(e.target.value as InsightStance | '')}
              className="h-8 w-48 text-sm"
            >
              <option value="">Без стороны</option>
              {Object.values(InsightStance).map((value) => (
                <option key={value} value={value}>
                  {insightStanceLabels[value]}
                </option>
              ))}
            </Select>
            <span className="text-muted-foreground">за или против гипотезы — необязательно</span>
          </div>

          {error && candidates !== null && <p className="text-destructive">{error}</p>}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2">
            <InlineCreateInsight
              productId={productId}
              onCreated={(insight) => attach(insight.id)}
            />
            <div className="flex items-center gap-3">
              <Link href={fullFormHref} className="text-muted-foreground hover:underline">
                Все поля →
              </Link>
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
