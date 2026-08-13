'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { gotoShortcuts } from '@/lib/keyboard-shortcuts-data'

const NEW_ROUTES: [string, string][] = [
  ['/products', '/products/new'],
  ['/research', '/research/new'],
  ['/segments', '/segments/new'],
  ['/jtbd', '/jtbd/new'],
  ['/hypotheses', '/hypotheses/new'],
  ['/conversations', '/conversations/new'],
  ['/competitors', '/competitors/new'],
  ['/features', '/features/new'],
  ['/marketing', '/marketing/new'],
  ['/insights', '/insights/new'],
]

const GOTO_ROUTES: Record<string, string> = Object.fromEntries(
  gotoShortcuts.map((s) => [s.key, s.href])
)

/** Fired on "c" or Cmd/Ctrl+K; QuickCapture listens for it. */
export const QUICK_CAPTURE_EVENT = 'rpm:quick-capture'

export function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  // components/ui/select.tsx (Radix, Фаза 2) renders its visible, focusable
  // control as a <button role="combobox"> rather than a native <select> — the
  // tag check alone no longer catches it.
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.getAttribute('role') === 'combobox' ||
    target.isContentEditable
  )
}

export function KeyboardShortcuts() {
  const router = useRouter()
  const pathname = usePathname()
  const awaitingGoto = useRef(false)
  const gotoTimeout = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd/Ctrl+K is a global command — it works even from inside a field,
      // unlike the bare-letter shortcuts below.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        document.dispatchEvent(new CustomEvent(QUICK_CAPTURE_EVENT))
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return

      if (awaitingGoto.current) {
        awaitingGoto.current = false
        clearTimeout(gotoTimeout.current)
        const target = GOTO_ROUTES[e.key.toLowerCase()]
        if (target) {
          e.preventDefault()
          router.push(target)
        }
        return
      }

      if (e.key === 'g') {
        awaitingGoto.current = true
        gotoTimeout.current = setTimeout(() => {
          awaitingGoto.current = false
        }, 1500)
        return
      }

      if (e.key === 'n') {
        const match = NEW_ROUTES.find(
          ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`)
        )
        if (match) {
          e.preventDefault()
          router.push(match[1])
        }
        return
      }

      // Quick capture (plans/2.0-product-leap-plan.md, A3). Handled here
      // rather than in QuickCapture's own listener because "c" is also the
      // second key of the "g c" goto sequence — two independent listeners
      // would both fire on it, opening the overlay while navigating away.
      // Owning the sequence state, this branch is only reached when no "g"
      // is pending.
      if (e.key === 'c') {
        e.preventDefault()
        document.dispatchEvent(new CustomEvent(QUICK_CAPTURE_EVENT))
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      clearTimeout(gotoTimeout.current)
    }
  }, [pathname, router])

  return null
}
