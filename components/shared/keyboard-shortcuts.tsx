'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const NEW_ROUTES: [string, string][] = [
  ['/products', '/products/new'],
  ['/research', '/research/new'],
  ['/segments', '/segments/new'],
  ['/jtbd', '/jtbd/new'],
  ['/hypotheses', '/hypotheses/new'],
  ['/conversations', '/conversations/new'],
  ['/competitors', '/competitors/new'],
  ['/features', '/features/new'],
  ['/rtb', '/rtb/new'],
]

const GOTO_ROUTES: Record<string, string> = {
  d: '/',
  p: '/products',
  r: '/research',
  s: '/segments',
  j: '/jtbd',
  h: '/hypotheses',
  c: '/conversations',
  k: '/competitors',
  f: '/features',
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

export function KeyboardShortcuts() {
  const router = useRouter()
  const pathname = usePathname()
  const awaitingGoto = useRef(false)
  const gotoTimeout = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
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
