'use client'

import { useEffect } from 'react'
import { recordRecentlyViewed } from '@/lib/client-storage'

export function RecentlyViewedTracker({
  href,
  title,
  kind,
}: {
  href: string
  title: string
  kind: string
}) {
  useEffect(() => {
    recordRecentlyViewed({ href, title, kind })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [href])

  return null
}
