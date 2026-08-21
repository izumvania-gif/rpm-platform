'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Inbox as InboxIcon, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNavStage } from '@/components/shared/use-nav-stage'
import {
  isBaseModule,
  shouldOfferStageToggle,
  visibleHrefs,
  type NavStage,
} from '@/lib/nav-disclosure'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { KeyboardShortcutsOverlay } from '@/components/shared/keyboard-shortcuts-overlay'
import { PersonaSwitcher } from '@/components/shared/persona-switcher'
import { PublicHeader } from '@/components/shared/public-header'
import { RutokenLogo } from '@/components/shared/rutoken-logo'

interface NavLink {
  href: string
  label: string
  match: string[]
  subLinks?: { href: string; label: string }[]
}

const links: NavLink[] = [
  {
    href: '/products',
    label: 'Продукты',
    match: ['/products', '/features', '/competitors', '/people', '/departments'],
    subLinks: [
      { href: '/features', label: 'Фичи' },
      { href: '/competitors', label: 'Конкуренты' },
      { href: '/people', label: 'Люди' },
      { href: '/departments', label: 'Департаменты' },
    ],
  },
  { href: '/segments', label: 'Сегменты', match: ['/segments'] },
  {
    href: '/research',
    label: 'Исследования',
    match: ['/research', '/hypotheses', '/conversations', '/insights'],
    subLinks: [
      { href: '/hypotheses', label: 'Гипотезы' },
      { href: '/conversations', label: 'Разговоры' },
      { href: '/insights', label: 'Инсайты' },
    ],
  },
  { href: '/marketing', label: 'Маркетинг', match: ['/marketing'] },
  {
    href: '/jtbd',
    label: 'JTBD',
    match: ['/jtbd'],
    subLinks: [{ href: '/jtbd/graph', label: 'Граф JTBD' }],
  },
]

function isActive(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

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

export function SiteNav({ autoStage = 'full' }: { autoStage?: NavStage }) {
  const pathname = usePathname()
  const { stage, override, choose } = useNavStage(autoStage)

  if (isActive(pathname, ['/public'])) {
    return <PublicHeader />
  }

  // Basic mode keeps the base chain only — and, so the nav never hides the
  // page you are standing on, whatever section the current route belongs to.
  const shownLinks = links.filter(
    (link) => stage === 'full' || isBaseModule(link.href) || isActive(pathname, link.match)
  )
  // Only the EXPAND direction lives in the header. Measured at 1280px: with
  // all five tabs shown the nav already fills its space, and because it is
  // min-w-0 with shrink-0 children and overflow-x-visible, the surplus spills
  // *over* its siblings rather than widening the page — the JTBD link ends up
  // on top of anything placed after it, silently swallowing clicks. (Same root
  // cause as the earlier Inbox-label regression.) While collapsed there are
  // three tabs and plenty of room, which is also where this control matters
  // most. The way back lives on the dashboard's module rail, which has room.
  const offerToggle = shouldOfferStageToggle(autoStage, override) && stage === 'basic'
  // Named once so the visible label and the accessible name can never drift —
  // below `lg` only the icon shows and aria-label carries the whole meaning.
  const toggleLabel = stage === 'basic' ? 'Все разделы' : 'Только основное'

  return (
    <header className="print:hidden">
      <div className="h-1 bg-primary" />
      <div className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between gap-4">
          {/* Логотип компании и имя продукта — разные вещи, поэтому оба, а не
              один вместо другого: Рутокен отвечает на «чьё это», RPM — на «что
              это». Разделены волосяной чертой. Логотип красный в светлой теме и
              светлый в тёмной (`currentColor`, см. RutokenLogo) — оба варианта
              санкционированы брендбуком, с. 1. */}
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <RutokenLogo className="h-4 w-auto text-primary dark:text-foreground" />
            <span aria-hidden className="h-5 w-px bg-border" />
            <span className="font-display text-lg font-bold tracking-tight">
              RPM<span className="text-primary">.</span>
            </span>
          </Link>
          <div className="flex min-w-0 items-center gap-4 sm:gap-6">
            <nav className="flex min-w-0 items-center gap-1 overflow-x-visible sm:gap-1.5">
              {shownLinks.map((link) => {
                const active = isActive(pathname, link.match)
                // Basic mode hides every sub-link (none of them is part of the
                // base chain), so an empty list must collapse the dropdown and
                // its chevron rather than render an empty panel.
                const subLinks = link.subLinks ? visibleHrefs(link.subLinks, stage) : []
                const hasSubLinks = subLinks.length > 0
                return (
                  <div key={link.href} className="group relative flex shrink-0 items-stretch">
                    <Link
                      href={link.href}
                      className={cn(
                        'flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground',
                        active &&
                          'bg-primary/10 font-semibold text-primary hover:bg-primary/10 hover:text-primary'
                      )}
                    >
                      {link.label}
                      {hasSubLinks && <ChevronDown size={14} className="text-muted-foreground" />}
                    </Link>
                    {hasSubLinks && (
                      <div
                        className={cn(
                          'invisible absolute left-0 top-full z-20 min-w-[10rem] rounded-md border bg-background py-1 opacity-0 shadow-md transition-opacity',
                          'group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100'
                        )}
                      >
                        {subLinks.map((sub) => {
                          const subActive =
                            pathname === sub.href || pathname.startsWith(`${sub.href}/`)
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              className={cn(
                                'block whitespace-nowrap px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground',
                                subActive && 'text-foreground font-medium'
                              )}
                            >
                              {sub.label}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </nav>
            {/* Progressive disclosure control (C1). Lives in the header's
                fixed-width action cluster, NOT inside <nav>: that nav is
                allowed to shrink (min-w-0) while its links are shrink-0, so
                anything placed there overflows underneath the search box and
                stops being clickable — found exactly that way in the browser.
                The label collapses on narrow viewports for the same reason the
                Inbox action is icon-only.
                Nothing is unreachable while collapsed: routes, search and the
                `g` shortcuts all still work, this only changes what the nav
                advertises. */}
            {offerToggle && (
              <button
                type="button"
                onClick={() => choose(stage === 'basic' ? 'full' : 'basic')}
                aria-label={toggleLabel}
                className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent hover:text-foreground xl:flex"
                title={
                  stage === 'basic'
                    ? 'Показать все разделы платформы'
                    : 'Оставить в меню только продукт, сегменты и JTBD'
                }
              >
                <LayoutGrid size={15} strokeWidth={1.75} aria-hidden />
                {/* Measured, not guessed: with the label this fits at 1280 and
                    1440 but not at 1024, where the nav again spills over the
                    button — hence xl:flex above. Below that width the rail's
                    copy of the control is the way in, and the dashboard is
                    where a new user lands anyway. */}
                {stage === 'basic' && <span>{toggleLabel}</span>}
              </button>
            )}
            <SearchBox />
            {/* Inbox (plans/2.0-product-leap-plan.md, B1) sits with the
                header actions, not as a sixth module tab: it is a way IN to
                the data, like search, rather than another section to fill —
                and adding a tab would work against C1's whole argument that
                13 modules already over-face a new user.
                Icon-only: the header was already at capacity at 1280px, and
                a text label pushed the search box over the JTBD tab. */}
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
    </header>
  )
}
