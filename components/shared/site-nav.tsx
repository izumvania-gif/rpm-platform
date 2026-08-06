'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    match: ['/products', '/features', '/competitors'],
    subLinks: [{ href: '/features', label: 'Фичи' }],
  },
  { href: '/segments', label: 'Сегменты', match: ['/segments'] },
  {
    href: '/research',
    label: 'Исследования',
    match: ['/research', '/hypotheses', '/conversations'],
    subLinks: [
      { href: '/hypotheses', label: 'Гипотезы' },
      { href: '/conversations', label: 'Разговоры' },
    ],
  },
  { href: '/marketing', label: 'Маркетинг', match: ['/marketing'] },
  { href: '/jtbd', label: 'JTBD', match: ['/jtbd'] },
]

function isActive(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export function SiteNav() {
  const pathname = usePathname()

  return (
    <header className="print:hidden">
      <div className="h-1 bg-primary" />
      <div className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            <span className="text-lg font-bold tracking-tight">
              RPM<span className="text-primary">.</span>
            </span>
          </Link>
          <nav className="flex min-w-0 items-stretch gap-4 overflow-x-visible sm:gap-6">
            {links.map((link) => {
              const active = isActive(pathname, link.match)
              return (
                <div key={link.href} className="group relative flex shrink-0 items-stretch">
                  <Link
                    href={link.href}
                    className={cn(
                      'flex shrink-0 items-center gap-1 whitespace-nowrap border-b-2 border-transparent py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                      active && 'border-primary text-foreground'
                    )}
                  >
                    {link.label}
                    {link.subLinks && <ChevronDown size={14} className="text-muted-foreground" />}
                  </Link>
                  {link.subLinks && (
                    <div
                      className={cn(
                        'invisible absolute left-0 top-full z-20 min-w-[10rem] rounded-md border bg-background py-1 opacity-0 shadow-md transition-opacity',
                        'group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100'
                      )}
                    >
                      {link.subLinks.map((sub) => {
                        const subActive = pathname === sub.href || pathname.startsWith(`${sub.href}/`)
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
        </div>
      </div>
    </header>
  )
}
