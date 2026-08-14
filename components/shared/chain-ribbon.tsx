import Link from 'next/link'
import { ChevronRight, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

// The discovery chain for one record, in one line
// (plans/inspirations.md рекомендация №6, Teresa Torres' Opportunity Solution
// Tree / Aha!'s strategy→feature linkage).
//
// The relations were always there — every detail page already loads them —
// but they were spread across three cards, so "why does this record exist"
// meant opening three more pages. This shows the whole line at once, and,
// more usefully, shows where it breaks: a stage with nothing in it renders as
// a dashed slot naming what is missing, with a link to fix it, rather than
// being silently omitted. A ribbon with a hole in it is the point.
//
// Pure presentation, no queries of its own: each page passes what it already
// fetched.

export type ChainItem = {
  /** What the chip shows — may be a key phrase (lib/key-phrase.ts). */
  label: string
  /** The untouched text for the tooltip; defaults to `label`. */
  fullLabel?: string
  href: string
}

export type RibbonStage = {
  /** Singular noun for the slot: «Сегмент», «JTBD», «Гипотеза». */
  title: string
  items: ChainItem[]
  /** Shown in place of the items when there are none: «нет сегмента». */
  emptyLabel: string
  /** Where to go to fill this gap; omitted when there is nothing sensible to link. */
  addHref?: string
  /** The record whose page this is — anchors the reader in the line. */
  current?: boolean
}

/** Two names plus a counter: any more and the ribbon stops being one line. */
const MAX_VISIBLE = 2

export function ChainRibbon({ stages }: { stages: RibbonStage[] }) {
  return (
    <nav
      aria-label="Цепочка связей этой записи"
      className="flex flex-wrap items-stretch gap-x-1 gap-y-2 text-xs"
    >
      {stages.map((stage, index) => (
        <div key={stage.title} className="flex items-stretch gap-1">
          <div
            className={cn(
              'min-w-0 rounded-md border px-2.5 py-1.5',
              stage.current && 'border-primary bg-primary/5',
              !stage.current && stage.items.length === 0 && 'border-dashed bg-transparent',
              !stage.current && stage.items.length > 0 && 'bg-muted/40'
            )}
          >
            <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
              {stage.title}
            </span>
            {stage.items.length === 0 ? (
              <span className="flex items-center gap-1 text-muted-foreground">
                {stage.emptyLabel}
                {stage.addHref && (
                  <Link
                    href={stage.addHref}
                    className="inline-flex items-center gap-0.5 underline hover:no-underline"
                  >
                    <Plus size={11} aria-hidden />
                    добавить
                  </Link>
                )}
              </span>
            ) : (
              <span className="flex flex-wrap items-center gap-x-1.5">
                {stage.items.slice(0, MAX_VISIBLE).map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="max-w-[16rem] truncate hover:underline"
                    title={item.fullLabel ?? item.label}
                  >
                    {item.label}
                  </Link>
                ))}
                {stage.items.length > MAX_VISIBLE && (
                  <span className="text-muted-foreground">+{stage.items.length - MAX_VISIBLE}</span>
                )}
              </span>
            )}
          </div>
          {index < stages.length - 1 && (
            <ChevronRight
              size={14}
              aria-hidden
              className="mt-3.5 shrink-0 text-muted-foreground/60"
            />
          )}
        </div>
      ))}
    </nav>
  )
}
