'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'

export function ThemeToggle() {
  // The FOUC-prevention script in app/layout.tsx already sets the class
  // before hydration — read it back instead of re-deriving from
  // localStorage/matchMedia, so this component never disagrees with it.
  const [isDark, setIsDark] = useState<boolean | null>(null)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  // Доступное имя и подсказка — из одной строки (фаза 27 плана 2.4).
  const label = isDark ? 'Включить светлую тему' : 'Включить тёмную тему'

  function toggle() {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <Tooltip content={label}>
      <Button type="button" variant="outline" size="icon" onClick={toggle} aria-label={label}>
        {/* Render nothing decisive until mounted, to avoid a flash of the wrong icon. */}
        {isDark === null ? null : isDark ? <Sun size={16} /> : <Moon size={16} />}
      </Button>
    </Tooltip>
  )
}
