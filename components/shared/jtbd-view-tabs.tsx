import Link from 'next/link'
import { cn } from '@/lib/utils'

export function JtbdViewTabs({ active }: { active: 'list' | 'graph' }) {
  const tabs = [
    { key: 'list' as const, href: '/jtbd', label: 'Список' },
    { key: 'graph' as const, href: '/jtbd/graph', label: 'Граф' },
  ]

  return (
    <div className="inline-flex rounded-md border p-0.5">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={cn(
            'rounded px-3 py-1.5 text-sm font-medium transition-colors',
            active === tab.key
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}
