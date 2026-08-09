import Link from 'next/link'
import { cn } from '@/lib/utils'

// Deliberate near-duplicate of RoadmapViewTabs (2nd consumer, not 3rd) — same
// List/Gantt switcher look, but /cpo has no productId query param to carry
// (the Gantt here spans every product at once, grouped by department).
export function MultiRoadmapViewTabs({ active }: { active: 'list' | 'gantt' }) {
  const tabs = [
    { key: 'list' as const, label: 'Список' },
    { key: 'gantt' as const, label: 'Гант' },
  ]

  return (
    <div className="inline-flex rounded-md border p-0.5">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={`/cpo?view=${tab.key}`}
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
