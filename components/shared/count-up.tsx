'use client'

import { useEffect, useRef, useState } from 'react'

// One orchestrated moment on dashboard load — skipped entirely under
// prefers-reduced-motion, per plans/growth-plan.md §2.7 Phase 3.
export function CountUp({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    if (value === 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value)
      return
    }

    const duration = 500
    const start = performance.now()
    let frame: number

    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1)
      setDisplay(Math.round(progress * value))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])

  return <span className={className}>{display}</span>
}
