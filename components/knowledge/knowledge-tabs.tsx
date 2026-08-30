'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { KNOWLEDGE_TABS, isKnowledgeTabActive } from '@/lib/knowledge-nav'

// Полоса вкладок базы знаний. Клиентский компонент ровно ради `usePathname`:
// какая вкладка активна, знает только адрес. Устроена так же, как полоса
// «Доставки» (components/pm/pm-tabs.tsx) — один и тот же жест в двух разделах
// должен и выглядеть одинаково.
export function KnowledgeTabs() {
  const pathname = usePathname()

  return (
    <nav aria-label="Разделы базы знаний" className="mb-6 flex flex-wrap gap-1 border-b">
      {KNOWLEDGE_TABS.map((tab) => {
        const active = isKnowledgeTabActive(tab, pathname)
        return (
          <Link
            key={tab.href}
            href={tab.href}
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
