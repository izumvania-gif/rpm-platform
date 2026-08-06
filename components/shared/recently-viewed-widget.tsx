'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getRecentlyViewed, type RecentlyViewedEntry } from '@/lib/client-storage'

export function RecentlyViewedWidget() {
  const [items, setItems] = useState<RecentlyViewedEntry[]>([])

  useEffect(() => {
    setItems(getRecentlyViewed())
  }, [])

  if (items.length === 0) return null

  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold mb-3">Недавно просмотренное</h2>
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="inline-block rounded-md border px-3 py-1.5 text-sm hover:border-primary"
            >
              <span className="text-muted-foreground">{item.kind}:</span> {item.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
