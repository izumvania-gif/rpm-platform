'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, ChevronRight, Inbox as InboxIcon, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNavStage } from '@/components/shared/use-nav-stage'
import { isBaseModule, shouldOfferStageToggle, type NavStage } from '@/lib/nav-disclosure'
import { CHAIN, GROUPS, OVERVIEW, isNodeActive, type NavNode } from '@/lib/nav-chain'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { KeyboardShortcutsOverlay } from '@/components/shared/keyboard-shortcuts-overlay'
import { PersonaSwitcher } from '@/components/shared/persona-switcher'
import { ProductSwitcher } from '@/components/shared/product-switcher'
import type { ActiveProduct } from '@/lib/product-context.server'
import { PublicHeader } from '@/components/shared/public-header'
import { RutokenLogo } from '@/components/shared/rutoken-logo'

// Шапка в два ряда (фаза 6 редизайна 2.1).
//
// Один ряд больше не вариант, и это арифметика, а не вкус: в меню-цепочке
// девять пунктов первого уровня против прежних пяти, и они не помещаются рядом
// с логотипом, поиском и четырьмя кнопками. Прежний ряд уже не помещался — nav
// в нём `overflow-x-visible` с нешринкующимися ссылками, поэтому лишняя ширина
// не расширяла строку, а наезжала на соседей и перехватывала клики (в фазе 5
// на этом перестали нажиматься «Инбокс» и поиск).
//
// Разделение рядов заодно раскладывает вещи по смыслу:
//   ряд 1 — кто я и где я работаю (логотип, активный продукт) плюс инструменты;
//   ряд 2 — куда я иду (цепочка).
// Это и снимает тесноту насовсем: у цепочки своя строка на всю ширину.

function SearchBox() {
  return (
    <form action="/search" method="get" className="hidden sm:block">
      <input
        type="search"
        name="q"
        placeholder="Поиск..."
        aria-label="Поиск"
        className="h-9 w-40 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </form>
  )
}

/** Один пункт меню со своим (необязательным) вторым уровнем. */
function NavEntry({ node, pathname }: { node: NavNode; pathname: string }) {
  const active = isNodeActive(node, pathname)
  const children = node.children ?? []

  return (
    <div className="group relative flex shrink-0 items-stretch">
      <Link
        href={node.href}
        className={cn(
          'flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground',
          active &&
            'bg-primary/10 font-semibold text-primary hover:bg-primary/10 hover:text-primary'
        )}
      >
        {node.label}
        {children.length > 0 && <ChevronDown size={14} className="text-muted-foreground" />}
      </Link>
      {children.length > 0 && (
        <div
          className={cn(
            'invisible absolute left-0 top-full z-20 min-w-[10rem] rounded-md border bg-background py-1 opacity-0 shadow-md transition-opacity',
            'group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100'
          )}
        >
          {children.map((child) => {
            const childActive = pathname === child.href || pathname.startsWith(`${child.href}/`)
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  'block whitespace-nowrap px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground',
                  childActive && 'font-medium text-foreground'
                )}
              >
                {child.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function SiteNav({
  autoStage = 'full',
  products = [],
  activeProductId = null,
}: {
  autoStage?: NavStage
  products?: ActiveProduct[]
  activeProductId?: string | null
}) {
  const pathname = usePathname()
  const { stage, override, choose } = useNavStage(autoStage)

  if (isNodeActive({ href: '/public', label: '' }, pathname)) {
    return <PublicHeader />
  }

  // Базовый режим оставляет только начало метода. Правило прежнее и его нельзя
  // ослаблять: скрывается лишь пустое, и раздел, на котором пользователь
  // сейчас стоит, показывается всегда — меню не имеет права спрятать страницу,
  // которую человек открыл.
  const visible = (nodes: NavNode[]) =>
    nodes.filter(
      (node) => stage === 'full' || isBaseModule(node.href) || isNodeActive(node, pathname)
    )
  const chain = visible(CHAIN)
  const groups = visible(GROUPS)

  // Теперь переключатель показывается всегда, а не только в свёрнутом виде.
  // Прежнее ограничение («место в шапке дефицитно») сняла вторая строка:
  // раньше единственным безусловным местом для него была плитка разделов на
  // дашборде, и с её удалением зрелый пользователь остался бы без способа
  // свернуть меню обратно.
  const offerToggle = shouldOfferStageToggle(autoStage, override) || stage === 'full'
  const toggleLabel = stage === 'basic' ? 'Все разделы' : 'Только основное'

  return (
    <header className="print:hidden">
      <div className="h-1 bg-primary" />

      {/* Ряд 1: кто я, где я работаю, чем ищу. */}
      <div className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="flex shrink-0 items-center gap-2.5">
              <RutokenLogo className="h-4 w-auto text-primary dark:text-foreground" />
              <span aria-hidden className="h-5 w-px bg-border" />
              <span className="font-display text-lg font-bold tracking-tight">
                RPM<span className="text-primary">.</span>
              </span>
            </Link>
            {products.length > 1 && (
              <>
                <span aria-hidden className="hidden h-5 w-px shrink-0 bg-border md:block" />
                <ProductSwitcher products={products} activeProductId={activeProductId} />
              </>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <SearchBox />
            {/* Инбокс — способ попасть ВНУТРЬ данных, как поиск, а не ещё один
                раздел, который надо заполнять. Поэтому он здесь, а не в
                цепочке. */}
            <Link
              href="/inbox"
              aria-label="Инбокс"
              title="Инбокс — вставить заметки списком"
              className={cn(
                'hidden shrink-0 rounded-md border p-2 transition-colors sm:flex',
                pathname === '/inbox'
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'hover:border-primary/50 hover:bg-accent'
              )}
            >
              <InboxIcon size={16} strokeWidth={1.75} aria-hidden />
            </Link>
            <PersonaSwitcher />
            <KeyboardShortcutsOverlay />
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Ряд 2: куда я иду. */}
      <div className="border-b bg-muted/30">
        <div className="container flex h-12 items-center gap-2 overflow-x-auto">
          <nav aria-label="Разделы" className="flex min-w-0 items-center gap-1">
            <NavEntry node={OVERVIEW} pathname={pathname} />

            <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-border" />

            {/* Шеврон между звеньями — заявление о порядке: цепочка
                последовательна, и каждое звено опирается на предыдущее. */}
            {chain.map((node, i) => (
              <div key={node.href} className="flex shrink-0 items-center">
                {i > 0 && (
                  <ChevronRight
                    size={14}
                    aria-hidden
                    className="shrink-0 text-muted-foreground/50"
                  />
                )}
                <NavEntry node={node} pathname={pathname} />
              </div>
            ))}

            {groups.length > 0 && <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-border" />}

            {/* Точки, а не шевроны: группы не продолжают цепочку. */}
            {groups.map((node, i) => (
              <div key={node.href} className="flex shrink-0 items-center">
                {i > 0 && (
                  <span aria-hidden className="px-1 text-muted-foreground/50">
                    ·
                  </span>
                )}
                <NavEntry node={node} pathname={pathname} />
              </div>
            ))}
          </nav>

          {offerToggle && (
            <button
              type="button"
              onClick={() => choose(stage === 'basic' ? 'full' : 'basic')}
              aria-label={toggleLabel}
              title={
                stage === 'basic'
                  ? 'Показать все разделы платформы'
                  : 'Оставить в меню только начало цепочки'
              }
              className="ml-auto hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent hover:text-foreground lg:flex"
            >
              <LayoutGrid size={14} strokeWidth={1.75} aria-hidden />
              <span>{toggleLabel}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
