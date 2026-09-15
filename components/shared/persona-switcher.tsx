'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// 2.0 (plans/platform-views-plan.md §2) — role switching is a simulated lens
// over today's single-tenant data, not a real access boundary: anyone using
// the app can open any of these, the same way anyone can already type the
// URL directly. This is a way to explore the 5-view concept, not a login
// system. Real per-role access control is a separate, later, larger plan
// (see §9 "Явно вне рамок" in the same doc).
//
// Пункты названы так же, как заголовки страниц, на которые ведут (фаза 19,
// plans/2.3-scenario-audit-plan.md): «PM» вёл на «Доставку», «Маркетинг» — на
// витрину, у которой с разделом «Обещания» общий корень. Кому адресована
// страница — в подсказке, а не в названии.
const personas = [
  { href: '/pm', label: 'Доставка', hint: 'для PM: роадмап, процессы, команда' },
  { href: '/cpo', label: 'CPO', hint: 'все продукты как экосистема' },
  { href: '/public', label: 'Компания', hint: 'открытый доступ, без входа' },
  { href: '/marketing-hub', label: 'Маркетинг: что сказать сегменту', hint: 'для маркетинга' },
  { href: '/sales-hub', label: 'Продажи', hint: 'материалы и «есть ли у нас фича X»' },
]

const HINT_ID = 'persona-switcher-hint'

export function PersonaSwitcher() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  // Стрелка вниз на кнопке открывает меню и сразу ставит фокус на первый
  // пункт (фаза 18) — так ведёт себя меню по APG; эффект нужен потому, что
  // пункты появляются только после рендера.
  const focusFirst = useRef(false)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      setOpen(false)
      // Меню закрылось — фокус возвращается на кнопку, а не пропадает на
      // `<body>`, откуда следующий Tab начинал бы страницу заново.
      buttonRef.current?.focus()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (!open || !focusFirst.current) return
    focusFirst.current = false
    items()[0]?.focus()
  }, [open])

  const items = () =>
    Array.from(menuRef.current?.querySelectorAll<HTMLAnchorElement>('[role="menuitem"]') ?? [])

  // Стрелки ходят по пунктам по кругу; Tab меню не перехватывает — это
  // выпадающий список, а не модальное окно.
  const onMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const list = items()
    if (list.length === 0) return
    e.preventDefault()
    const index = list.findIndex((el) => el === document.activeElement)
    const step = e.key === 'ArrowDown' ? 1 : -1
    list[(index + step + list.length) % list.length].focus()
  }

  return (
    <div ref={containerRef} className="relative">
      <Tooltip
        side="bottom"
        content="Страницы для других ролей: доставка, CPO, компания, маркетинг, продажи"
      >
        <Button
          ref={buttonRef}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen((v) => !v)}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowDown') return
            e.preventDefault()
            focusFirst.current = true
            setOpen(true)
          }}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Представления"
        >
          <LayoutGrid size={14} />
          {/* Ниже `sm` остаётся одна иконка: на 390px подпись растягивала
              правую группу так, что та наезжала на логотип. */}
          <span className="hidden sm:inline">Представления</span>
        </Button>
      </Tooltip>
      {open && (
        <div
          className={cn(
            'absolute right-0 top-full z-20 mt-1 min-w-[18rem] rounded-md border bg-background py-1 shadow-md'
          )}
        >
          {/* Подсказка стоит рядом с меню, а не внутри него: у `role="menu"`
              дети — только пункты, и абзац там был бы ошибкой разметки. */}
          <p id={HINT_ID} className="px-3 py-1.5 text-xs text-muted-foreground">
            2.0-представления — не граница доступа
          </p>
          <div
            ref={menuRef}
            role="menu"
            aria-label="Представления"
            aria-describedby={HINT_ID}
            onKeyDown={onMenuKeyDown}
          >
            {personas.map((persona) => (
              <Link
                key={persona.href}
                href={persona.href}
                role="menuitem"
                aria-label={persona.label}
                onClick={() => setOpen(false)}
                className="block px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:text-foreground focus-visible:outline-none"
              >
                <span className="block text-foreground">{persona.label}</span>
                <span className="block text-xs">{persona.hint}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
