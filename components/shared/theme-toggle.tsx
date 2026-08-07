'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  // The FOUC-prevention script in app/layout.tsx already sets the class
  // before hydration — read it back instead of re-deriving from
  // localStorage/matchMedia, so this component never disagrees with it.
  const [isDark, setIsDark] = useState<boolean | null>(null)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggle() {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggle}
      aria-label={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
      title={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
    >
      {/* Render nothing decisive until mounted, to avoid a flash of the wrong icon. */}
      {isDark === null ? null : isDark ? <Sun size={16} /> : <Moon size={16} />}
    </Button>
  )
}
