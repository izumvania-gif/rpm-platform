'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { getDefaultProductId, setDefaultProductId } from '@/lib/client-storage'
import { QUICK_CAPTURE_EVENT } from '@/components/shared/keyboard-shortcuts'
import { listProductsForCapture } from '@/lib/actions/products'
import { createInsightQuick } from '@/lib/actions/insights'
import { createHypothesisQuick } from '@/lib/actions/hypotheses'
import { createSegmentQuick } from '@/lib/actions/segments'

// Global quick capture (plans/2.0-product-leap-plan.md, A3).
//
// A discovery thought does not arrive while you happen to be standing on the
// right module page. Before this, recording an insight meant navigating to
// /insights/new — two page loads and a lost train of thought. This captures
// from anywhere without leaving the current page.
//
// Deliberately limited to the three types that need nothing but text plus a
// product. JTBD is not offered even though createJtbdQuick exists: it
// additionally requires a category and a job type, and a JTBD captured with a
// junk placeholder category is worse than no JTBD — it pollutes the very
// gaps/coverage reports the model exists to feed. The footer links to the
// full form for those cases instead.
type CaptureType = 'insight' | 'hypothesis' | 'segment'

// `saved` is spelled out per type rather than derived from the label —
// Russian agreement is gendered (инсайт/сегмент masculine, гипотеза
// feminine) and deriving it by appending a suffix produced "Сегмент
// сохранёна", wrong on both the gender and the vowel.
const TYPES: {
  value: CaptureType
  label: string
  placeholder: string
  href: string
  saved: string
}[] = [
  {
    value: 'insight',
    label: 'Инсайт',
    placeholder: 'Цитата клиента или ключевой вывод',
    href: '/insights/new',
    saved: 'Инсайт сохранён',
  },
  {
    value: 'hypothesis',
    label: 'Гипотеза',
    placeholder: 'Если …, то …',
    href: '/hypotheses/new',
    saved: 'Гипотеза сохранена',
  },
  {
    value: 'segment',
    label: 'Сегмент',
    placeholder: 'Название сегмента',
    href: '/segments/new',
    saved: 'Сегмент сохранён',
  },
]

export function QuickCapture() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [products, setProducts] = useState<{ id: string; name: string }[] | null>(null)
  const [productId, setProductId] = useState('')
  const [type, setType] = useState<CaptureType>('insight')
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const activeType = TYPES.find((t) => t.value === type)!

  // Products are fetched on first open only (see listProductsForCapture).
  useEffect(() => {
    if (!open || products !== null) return
    listProductsForCapture().then((list) => {
      setProducts(list)
      const remembered = getDefaultProductId()
      const initial = list.find((p) => p.id === remembered)?.id ?? list[0]?.id ?? ''
      setProductId(initial)
    })
  }, [open, products])

  useEffect(() => {
    if (open) textareaRef.current?.focus()
  }, [open])

  // The open shortcut lives in KeyboardShortcuts (it owns the "g …" sequence
  // state that "c" would otherwise collide with) and reaches us as an event.
  useEffect(() => {
    function onOpen() {
      setOpen((v) => !v)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener(QUICK_CAPTURE_EVENT, onOpen)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener(QUICK_CAPTURE_EVENT, onOpen)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const submit = useCallback(() => {
    const value = text.trim()
    if (!value || !productId) return
    startTransition(async () => {
      const result =
        type === 'insight'
          ? await createInsightQuick(productId, value)
          : type === 'hypothesis'
            ? await createHypothesisQuick(productId, value)
            : await createSegmentQuick(productId, value)

      if (!result.ok) {
        setError(result.error)
        return
      }
      setDefaultProductId(productId)
      // Stay open and clear the field: capture is usually bursty — three
      // thoughts from one call go in back to back, and reopening the overlay
      // between them would defeat the point.
      setText('')
      setError(null)
      setSaved(activeType.saved)
      textareaRef.current?.focus()
      router.refresh()
    })
  }, [text, productId, type, activeType.saved, router])

  useEffect(() => {
    if (!saved) return
    const t = setTimeout(() => setSaved(null), 2500)
    return () => clearTimeout(t)
  }, [saved])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Быстрый захват"
      className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/20 px-4 pt-[12vh] backdrop-blur-[1px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false)
      }}
    >
      <div className="w-full max-w-xl space-y-3 rounded-lg border bg-background p-4 shadow-lg">
        <div className="flex flex-wrap items-center gap-1.5">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={cn(
                'rounded-md px-2.5 py-1 text-sm transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                type === t.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent'
              )}
              aria-pressed={type === t.value}
            >
              {t.label}
            </button>
          ))}
          <span className="ml-auto font-mono text-[11px] text-muted-foreground">Esc — закрыть</span>
        </div>

        <Textarea
          ref={textareaRef}
          rows={3}
          value={text}
          placeholder={activeType.placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              submit()
            }
          }}
        />

        {products !== null && products.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Сначала создайте продукт —{' '}
            <Link href="/products/new" className="underline" onClick={() => setOpen(false)}>
              новый продукт
            </Link>
            .
          </p>
        ) : (
          <Select
            aria-label="Продукт"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            {(products ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" disabled={isPending || !text.trim() || !productId} onClick={submit}>
            Сохранить
          </Button>
          <span className="font-mono text-[11px] text-muted-foreground">⌘↵</span>
          <Link
            href={activeType.href}
            onClick={() => setOpen(false)}
            className="text-xs text-muted-foreground hover:underline"
          >
            Больше полей →
          </Link>
          {saved && (
            <span role="status" className="ml-auto text-xs text-muted-foreground">
              {saved}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
