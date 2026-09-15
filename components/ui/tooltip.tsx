'use client'

import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { Info } from 'lucide-react'
import type { ReactElement, ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Один механизм подсказок на весь интерфейс (фаза 27 плана 2.4).
//
// До этого объяснения жили в атрибутах `title` (видны только мыши и только
// после долгой паузы) и в трёх текстах под подписями. Здесь один примитив на
// Radix Tooltip — той же библиотеке, что у Select: открывается по наведению
// **и по фокусу** (клавиатура его тоже видит), задержка ~300 мс, только текст.
//
// Что подсказка объясняет — то, чего нет в подписи: что считается, что
// произойдёт, чем отличается от соседа. Она никогда не несёт сведений, без
// которых действие не выполнить: такие идут видимым текстом.
//
// `title` при этом остаётся у одного класса мест — полного текста обрезанной
// записи (ключевая фраза в строке, оригинал в `title`): это данные, а не
// объяснение, и E2E ищет записи по нему (`byFullText`).

export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={300} skipDelayDuration={500}>
      {children}
    </TooltipPrimitive.Provider>
  )
}

export function Tooltip({
  content,
  children,
  side = 'top',
}: {
  content: string
  /** Один элемент, умеющий принять ref: Button, Link, <button>. */
  children: ReactElement
  side?: 'top' | 'bottom' | 'left' | 'right'
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          collisionPadding={8}
          className="z-50 max-w-xs rounded-md border bg-popover px-3 py-1.5 text-xs leading-snug text-popover-foreground shadow-md"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

/**
 * Значок ⓘ с подсказкой — для мест, где нет кнопки, к которой подсказку
 * привязать: заголовок секции, подпись поля, плитка метрики.
 *
 * Ставится **рядом** с заголовком или `<Label>`, а не внутри: доступное имя
 * заголовка и поля собирается из их содержимого, и кнопка внутри добавила бы к
 * нему своё имя — `getByRole('heading', { name })` и `getByLabel` перестали
 * бы совпадать, а читалка объявляла бы заголовок вместе с кнопкой.
 *
 * Имя кнопки — постоянное «Подсказка», а не сам текст: `getByLabel('Категория')`
 * ищет подстроку без учёта регистра во всех доступных именах на странице, и
 * значок с текстом «…по категориям строится матрица» откликался на него
 * наравне с полем — 42 спека упали разом. Текст подсказки читалка получает
 * через `aria-describedby`, который Radix ставит на кнопку при открытии — а
 * открывается она и по фокусу.
 */
export function Hint({ text, className }: { text: string; className?: string }) {
  return (
    <Tooltip content={text}>
      <button
        type="button"
        aria-label="Подсказка"
        className={cn(
          'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full align-middle text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className
        )}
      >
        <Info size={14} strokeWidth={1.75} aria-hidden />
      </button>
    </Tooltip>
  )
}
