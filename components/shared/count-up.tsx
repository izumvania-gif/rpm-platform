'use client'

import { useEffect, useState } from 'react'

// One orchestrated moment on dashboard load — skipped entirely under
// prefers-reduced-motion, per plans/growth-plan.md §2.7 Phase 3.
//
// No "already started" ref guard here on purpose: under React 18 Strict Mode
// (dev only), effects run mount -> cleanup -> mount again. A guard that
// persists across that double-invoke (a ref) lets the first invocation
// schedule a frame that the simulated-unmount cleanup cancels before it ever
// paints, then blocks the second invocation from scheduling a new one --
// the animation never completes a single frame in dev. Letting the effect
// re-run freely is safe here: cancelAnimationFrame on an unstarted/already-
// fired frame is a no-op, so the second run just starts clean from 0.
export function CountUp({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
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
