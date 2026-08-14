'use client'

import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { QUICK_CAPTURE_EVENT } from '@/components/shared/keyboard-shortcuts'
import type { CaptureType, QuickCaptureDetail } from '@/lib/quick-capture'

// The «+» on a module card.
//
// Adding one record used to cost two page loads and your place on the page:
// «Добавить сегмент» navigated to /segments/new and back. When the record is
// one field plus a product — and the product is the page you are already
// standing on — that is the whole interaction, so it happens in place.
//
// Not every type qualifies. Разговор carries a transcript, Исследование a
// type/status/date, Ресурс a URL and a kind; those keep their link to the full
// form rather than being squeezed into a modal that would silently drop half
// of what they are. Passing no `type` is how a call site says so.
export function QuickAddButton({
  type,
  productId,
  href,
  label,
}: {
  /** Omit for a record the modal deliberately cannot create in one field. */
  type?: CaptureType
  productId: string
  /** Always present: the fallback, and where «Больше полей» would land. */
  href: string
  label: string
}) {
  const className = buttonVariants({ variant: 'outline', size: 'sm' }) + ' shrink-0 px-2.5'

  if (!type) {
    return (
      <Link href={href} aria-label={label} title={label} className={className + ' print:hidden'}>
        +
      </Link>
    )
  }

  return (
    <button
      type="button"
      aria-label={label}
      aria-haspopup="dialog"
      title={label}
      className={className + ' print:hidden'}
      onClick={() => {
        const detail: QuickCaptureDetail = { type, productId }
        document.dispatchEvent(new CustomEvent(QUICK_CAPTURE_EVENT, { detail }))
      }}
    >
      +
    </button>
  )
}
