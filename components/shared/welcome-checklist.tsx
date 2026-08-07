'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export interface ChecklistItem {
  label: string
  done: boolean
  href: string
  cta: string
}

export function WelcomeChecklist({
  productId,
  items,
}: {
  productId: string
  items: ChecklistItem[]
}) {
  const [dismissed, setDismissed] = useState(true)
  const storageKey = `rpm:welcome-dismissed:${productId}`

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(storageKey) === '1')
    } catch {
      setDismissed(false)
    }
  }, [storageKey])

  const remaining = items.filter((item) => !item.done)
  if (dismissed || remaining.length === 0) return null

  return (
    <div className="rounded-lg border bg-muted/40 p-4 print:hidden">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">Начало работы с продуктом</h2>
        <button
          type="button"
          className="text-xs text-muted-foreground hover:underline"
          onClick={() => {
            try {
              window.localStorage.setItem(storageKey, '1')
            } catch {
              // ignore
            }
            setDismissed(true)
          }}
        >
          Скрыть
        </button>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-center justify-between text-sm">
            <span className={item.done ? 'text-muted-foreground line-through' : ''}>
              {item.label}
            </span>
            {!item.done && (
              <Link href={item.href} className="text-primary hover:underline">
                {item.cta}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
