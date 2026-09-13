'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Inbox as InboxIcon, LayoutGrid, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isNodeActive, type NavNode } from '@/lib/nav-chain'

// Панель разделов для узких экранов (фаза 13, plans/2.2-usability-plan.md).
//
// Заменяет горизонтальный скролл меню, а не дополняет его. Скролл был плох не
// теснотой, а двумя следствиями:
//
//  1. `overflow-x: auto` по спецификации превращает и `overflow-y` в `auto`,
//     поэтому выпадающие подменю обрезались рядом высотой 48px — из 170px
//     меню было видно восемь. Тринадцать маршрутов существовали, но открыть их
//     из шапки было нельзя.
//  2. Скролл ничем себя не объявлял: ни градиента, ни стрелок. Пункт за краем
//     не «спрятан», он для пользователя просто не существует.
//
// Панель решает обе задачи разом и заодно даёт узкому экрану то, чего у него
// не было вовсе: поиск и инбокс, которые в шапке скрыты ниже `sm`.
export function NavSheet({
  overview,
  chain,
  groups,
  offerToggle,
  toggleLabel,
  onToggleStage,
}: {
  overview: NavNode
  chain: NavNode[]
  groups: NavNode[]
  offerToggle: boolean
  toggleLabel: string
  onToggleStage: () => void
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Закрыть с клавиатуры — значит вернуть фокус на кнопку (фаза 18). Раньше
  // после Escape он оставался на исчезнувшей ссылке, то есть на `<body>`, и
  // следующий Tab начинал страницу с самого начала.
  const closeToButton = () => {
    setOpen(false)
    buttonRef.current?.focus()
  }

  // Закрытие по Escape и по клику мимо — те же правила, что у переключателя
  // представлений, чтобы панели вели себя одинаково.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeToButton()
    }
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open])

  // Переход закрывает панель: остаться открытой поверх новой страницы она не
  // имеет права — это читается как «ничего не произошло».
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const section = (title: string, nodes: NavNode[], numbered: boolean) => (
    <div className="py-2">
      <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      {nodes.map((node, i) => {
        const active = isNodeActive(node, pathname)
        return (
          <div key={node.href}>
            <Link
              href={node.href}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent',
                active ? 'bg-primary/10 text-primary' : 'text-foreground'
              )}
            >
              {numbered && (
                <span
                  aria-hidden
                  className="w-4 shrink-0 text-center font-mono text-xs text-muted-foreground"
                >
                  {i + 1}
                </span>
              )}
              {/* Порядок в вертикальном списке несёт номер, а не шеврон:
                  шеврон справа читается как «есть вложенность», а вложенность
                  здесь показана отступом. */}
              <span className="min-w-0 flex-1 truncate">{node.label}</span>
            </Link>
            {(node.children ?? []).map((child) => {
              const childActive = pathname === child.href || pathname.startsWith(`${child.href}/`)
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={cn(
                    'block rounded-md py-1.5 pl-10 pr-3 text-sm transition-colors hover:bg-accent',
                    childActive ? 'font-medium text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {child.label}
                </Link>
              )
            })}
          </div>
        )
      })}
    </div>
  )

  return (
    <div ref={containerRef} className="relative xl:hidden">
      {/* Не `aria-haspopup="menu"`: панель — не меню в смысле ARIA (внутри
          поиск, ссылки и кнопка), а раскрывающийся блок с навигацией. */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="nav-sheet-panel"
        aria-label="Разделы"
        className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-accent"
      >
        {open ? <X size={15} aria-hidden /> : <Menu size={15} aria-hidden />}
        <span>Разделы</span>
      </button>

      {open && (
        <nav
          id="nav-sheet-panel"
          aria-label="Разделы"
          className="absolute left-0 top-full z-40 mt-1 max-h-[75vh] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-md border bg-background p-1 shadow-lg"
        >
          {/* Поиск и инбокс ниже `sm` из шапки скрыты — здесь они есть всегда,
              иначе на телефоне попасть внутрь данных было бы нечем. */}
          <form action="/search" method="get" className="p-2 sm:hidden">
            <input
              type="search"
              name="q"
              placeholder="Поиск..."
              aria-label="Поиск"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </form>
          <Link
            href="/inbox"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent sm:hidden"
          >
            <InboxIcon size={15} strokeWidth={1.75} aria-hidden />
            Инбокс
          </Link>

          <div className="border-t sm:border-t-0">{section('Обзор', [overview], false)}</div>
          <div className="border-t">{section('Цепочка дискавери', chain, true)}</div>
          {groups.length > 0 && <div className="border-t">{section('Разделы', groups, false)}</div>}

          {offerToggle && (
            <div className="border-t p-1">
              <button
                type="button"
                onClick={() => {
                  onToggleStage()
                  closeToButton()
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <LayoutGrid size={14} strokeWidth={1.75} aria-hidden />
                {toggleLabel}
              </button>
            </div>
          )}
        </nav>
      )}
    </div>
  )
}
