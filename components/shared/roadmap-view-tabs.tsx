import Link from 'next/link'
import { cn } from '@/lib/utils'

// Same tab-switcher look as JtbdViewTabs, but /pm is one route with a
// productId query param already, not two separate routes like /jtbd vs
// /jtbd/graph — so this switches a `view` query param instead of the href.
export function RoadmapViewTabs({
  active,
  productId,
}: {
  active: 'list' | 'gantt'
  productId: string
}) {
  const tabs = [
    { key: 'list' as const, label: 'Список' },
    { key: 'gantt' as const, label: 'Гант' },
  ]

  return (
    <div className="inline-flex rounded-md border p-0.5">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={`/pm?productId=${productId}&view=${tab.key}`}
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
