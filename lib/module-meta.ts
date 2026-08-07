import type { SignalTone } from '@/lib/signal-colors'

export interface ModuleMeta {
  href: string
  label: string
  description: string
}

export const productModule: ModuleMeta = {
  href: '/products',
  label: 'Продукты',
  description: 'Профили продуктов и их стадии',
}

export interface ModuleGroupMeta {
  title: string
  description: string
  tone: SignalTone
}

// Mirrors the two-group split on the product detail page
// (app/products/[id]/page.tsx) — same grouping, same tone per group, same copy,
// reused on the dashboard so both pages teach the same information architecture
// (see plans/growth-plan.md §2.7).
export const researchGroupMeta: ModuleGroupMeta = {
  title: 'Исследование клиентов',
  description: 'Кто клиенты, какие у них задачи и что подтверждено исследованиями',
  tone: 'blue',
}
export const researchModules: ModuleMeta[] = [
  { href: '/research', label: 'Исследования', description: 'Репозиторий клиентских исследований' },
  { href: '/segments', label: 'Сегменты', description: 'Сегменты клиентов по продуктам' },
  { href: '/jtbd', label: 'JTBD', description: 'Задачи клиентов по категориям' },
  { href: '/hypotheses', label: 'Гипотезы', description: 'Пайплайн гипотез по статусам' },
  { href: '/conversations', label: 'Разговоры', description: 'База CustDev-разговоров' },
  { href: '/insights', label: 'Инсайты', description: 'Атомарные цитаты и выводы из исследований' },
]

export const positioningGroupMeta: ModuleGroupMeta = {
  title: 'Позиционирование',
  description: 'Как продукт решает задачи клиентов и чем отличается от конкурентов',
  tone: 'violet',
}
export const positioningModules: ModuleMeta[] = [
  { href: '/competitors', label: 'Конкуренты', description: 'Конкурентное окружение по продуктам' },
  { href: '/features', label: 'Фичи', description: 'Как продукт закрывает JTBD' },
  { href: '/marketing', label: 'Маркетинг', description: 'Маркетинговые обещания (RTB) на основе фич' },
]

// Single source of truth for list-page headers (SectionHeading) — same one-liner
// shown on the matching dashboard tile, keyed by route.
export const moduleByHref: Record<string, ModuleMeta> = Object.fromEntries(
  [productModule, ...researchModules, ...positioningModules].map((m) => [m.href, m])
)
