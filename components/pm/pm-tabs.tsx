'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { PM_TABS, isPmTabActive, pmTabHref } from '@/lib/pm-nav'

// Вкладки второго уровня «Доставки».
//
// Клиентский компонент ровно ради `usePathname`: какая вкладка активна, знает
// только адрес. Данных не грузит и состояния не держит.
export function PmTabs({ productId }: { productId?: string | null }) {
  const pathname = usePathname()

  return (
    <nav aria-label="Разделы доставки" className="flex flex-wrap gap-1 border-b">
      {PM_TABS.map((tab) => {
        const active = isPmTabActive(tab, pathname)
        return (
          <Link
            key={tab.href}
            href={pmTabHref(tab.href, productId)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
