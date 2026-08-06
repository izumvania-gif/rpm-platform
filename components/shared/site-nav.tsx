'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const links = [
  { href: '/products', label: 'Продукты' },
  { href: '/research', label: 'Исследования' },
  { href: '/segments', label: 'Сегменты' },
  { href: '/jtbd', label: 'JTBD' },
  { href: '/hypotheses', label: 'Гипотезы' },
  { href: '/conversations', label: 'Разговоры' },
  { href: '/competitors', label: 'Конкуренты' },
  { href: '/features', label: 'Фичи' },
  { href: '/rtb', label: 'RTB' },
]

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
              ECHO<span className="text-primary">.</span>
            </span>
          </Link>
          <nav className="flex min-w-0 gap-4 overflow-x-auto sm:gap-6">
            {links.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'shrink-0 whitespace-nowrap border-b-2 border-transparent py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                    active && 'border-primary text-foreground'
                  )}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </header>
  )
}
