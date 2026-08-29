import Link from 'next/link'
import { cn } from '@/lib/utils'

// Переключатель «Список / Гант» на /cpo.
//
// Раньше это был осознанный почти-дубль `RoadmapViewTabs` с `/pm`. В фазе 9
// тот переключатель исчез: на «Доставке» «Гант» стал отдельной вкладкой со
// своим маршрутом, потому что у пункта меню обязан быть адрес. Здесь так не
// сделано намеренно — `/cpo` это одна страница-обзор, а не раздел с
// подуровнем, и заводить ей вкладки в меню не за что: гант тут охватывает все
// продукты сразу, сгруппированные по департаментам.
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
