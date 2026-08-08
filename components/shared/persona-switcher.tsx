'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// 2.0 (plans/platform-views-plan.md §2) — role switching is a simulated lens
// over today's single-tenant data, not a real access boundary: anyone using
// the app can open any of these, the same way anyone can already type the
// URL directly. This is a way to explore the 5-view concept, not a login
// system. Real per-role access control is a separate, later, larger plan
// (see §9 "Явно вне рамок" in the same doc).
const personas = [
  { href: '/pm', label: 'PM' },
  { href: '/cpo', label: 'CPO' },
  { href: '/public', label: 'Компания (открытый доступ)' },
  { href: '/marketing-hub', label: 'Маркетинг' },
  { href: '/sales-hub', label: 'Продажи' },
]

export function PersonaSwitcher() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <LayoutGrid size={14} />
        Представления
      </Button>
      {open && (
        <div
          role="menu"
          className={cn(
            'absolute right-0 top-full z-20 mt-1 min-w-[16rem] rounded-md border bg-background py-1 shadow-md'
          )}
        >
          <p className="px-3 py-1.5 text-xs text-muted-foreground">
            Черновые 2.0-представления — не граница доступа
          </p>
          {personas.map((persona) => (
            <Link
              key={persona.href}
              href={persona.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block whitespace-nowrap px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {persona.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
