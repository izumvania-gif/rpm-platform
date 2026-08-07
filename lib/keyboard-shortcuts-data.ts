// Single source of truth for the "g then <letter>" navigation shortcuts —
// consumed both by the actual key-handling logic (components/shared/
// keyboard-shortcuts.tsx) and by the discoverability overlay (components/
// shared/keyboard-shortcuts-overlay.tsx) so the two can't drift apart.
export interface GotoShortcut {
  key: string
  label: string
  href: string
}

export const gotoShortcuts: GotoShortcut[] = [
  { key: 'd', label: 'Дашборд', href: '/' },
  { key: 'p', label: 'Продукты', href: '/products' },
  { key: 'r', label: 'Исследования', href: '/research' },
  { key: 's', label: 'Сегменты', href: '/segments' },
  { key: 'j', label: 'JTBD', href: '/jtbd' },
  { key: 'h', label: 'Гипотезы', href: '/hypotheses' },
  { key: 'c', label: 'Разговоры', href: '/conversations' },
  { key: 'f', label: 'Фичи', href: '/features' },
  { key: 'm', label: 'Маркетинг', href: '/marketing' },
  { key: 'i', label: 'Инсайты', href: '/insights' },
  { key: 'k', label: 'Конкуренты', href: '/competitors' },
]
