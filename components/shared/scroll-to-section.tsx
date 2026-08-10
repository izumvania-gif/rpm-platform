'use client'

import { useEffect } from 'react'

// Next.js Server Actions' redirect() drops URL hash fragments entirely (the
// hash never reaches the browser, confirmed by testing — not just a scroll
// quirk), so a `#section` anchor on the redirect target can't be used to land
// back at the right part of /pm after "Добавить X". A `scrollTo` query param
// survives the redirect (query strings do), so the server page reads it and
// this tiny client component does the actual scroll on mount.
export function ScrollToSection({ id }: { id?: string }) {
  useEffect(() => {
    if (!id) return
    document.getElementById(id)?.scrollIntoView({ block: 'start' })
  }, [id])

  return null
}
