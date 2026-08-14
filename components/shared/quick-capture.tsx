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
import { createJtbdQuick } from '@/lib/actions/jtbd-graph'
import { createFeatureQuick } from '@/lib/actions/features'
import { createRTBQuick } from '@/lib/actions/rtbs'
import { createCompetitorQuick } from '@/lib/actions/competitors'
import { Input } from '@/components/ui/input'
import {
  CAPTURE_TYPES,
  captureTypeByValue,
  fullFormHref,
  type CaptureType,
  type QuickCaptureDetail,
} from '@/lib/quick-capture'

// Global quick capture (plans/2.0-product-leap-plan.md, A3).
//
// A discovery thought does not arrive while you happen to be standing on the
// right module page. Before this, recording an insight meant navigating to
// /insights/new — two page loads and a lost train of thought. This captures
// from anywhere without leaving the current page.
//
// The type table lives in lib/quick-capture.ts, not here: the product page is
// a Server Component and reads the same list to decide whether its «+» opens
// this modal or navigates.
//
// Every type offered asks only for what the model genuinely requires. JTBD is
// the one with a second field, and that is precisely why it can be offered:
// its category is required, and a JTBD saved with a placeholder category would
// pollute the coverage and gaps reports the model exists to feed. Разговор,
// Исследование and Продукт are still not here — a transcript, a study's
// type/status/date and a product's whole identity are not one-field records,
// and a modal that pretended otherwise would quietly drop them.

/**
 * One call per type — deliberately a switch rather than a lookup table of
 * actions: each createXQuick has its own signature, and a table would have to
 * erase them to a common shape, losing exactly the argument checking that
 * makes the JTBD category impossible to forget.
 */
function createByType(type: CaptureType, productId: string, value: string, extra: string) {
  switch (type) {
    case 'insight':
      return createInsightQuick(productId, value)
    case 'hypothesis':
      return createHypothesisQuick(productId, value)
    case 'segment':
      return createSegmentQuick(productId, value)
    case 'jtbd':
      // SMALL_JOB is the schema's own default for jobType — the modal does not
      // invent a classification, it leaves the field at what a record created
      // anywhere else without an explicit choice would get.
      return createJtbdQuick(productId, value, extra, 'SMALL_JOB')
    case 'feature':
      return createFeatureQuick(productId, value)
    case 'rtb':
      return createRTBQuick(productId, value)
    case 'competitor':
      return createCompetitorQuick(productId, value)
  }
}

export function QuickCapture() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [products, setProducts] = useState<{ id: string; name: string }[] | null>(null)
  const [productId, setProductId] = useState('')
  const [type, setType] = useState<CaptureType>('insight')
  const [text, setText] = useState('')
  const [extra, setExtra] = useState('')
  /** Set when opened from a «+» that already knows the product. */
  const [presetProductId, setPresetProductId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const activeType = captureTypeByValue(type)

  // Products are fetched on first open only (see listProductsForCapture).
  useEffect(() => {
    if (!open || products !== null) return
    listProductsForCapture().then((list) => {
      setProducts(list)
      const remembered = presetProductId ?? getDefaultProductId()
      const initial = list.find((p) => p.id === remembered)?.id ?? list[0]?.id ?? ''
      setProductId(initial)
    })
  }, [open, products, presetProductId])

  useEffect(() => {
    if (open) textareaRef.current?.focus()
  }, [open])

  // The open shortcut lives in KeyboardShortcuts (it owns the "g …" sequence
  // state that "c" would otherwise collide with) and reaches us as an event.
  useEffect(() => {
    function onOpen(event: Event) {
      // A bare hotkey toggles; a «+» that names a type and a product opens
      // straight into it, so the modal is never a step backwards from the
      // button it replaced.
      const detail = (event as CustomEvent<QuickCaptureDetail | undefined>).detail
      if (!detail) {
        setOpen((v) => !v)
        return
      }
      if (detail.type) setType(detail.type)
      if (detail.productId) {
        setPresetProductId(detail.productId)
        setProductId(detail.productId)
      }
      setError(null)
      setOpen(true)
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
    const extraValue = extra.trim()
    if (!value || !productId) return
    // JTBD is the only type with a second required field; refusing here is
    // what keeps a placeholder category out of the coverage reports.
    if (activeType.extraField && !extraValue) return

    startTransition(async () => {
      const result = await createByType(type, productId, value, extraValue)

      if (!result.ok) {
        setError(result.error)
        return
      }
      setDefaultProductId(productId)
      // Stay open and clear the field: capture is usually bursty — three
      // thoughts from one call go in back to back, and reopening the overlay
      // between them would defeat the point.
      setText('')
      setExtra('')
      setError(null)
      setSaved(activeType.saved)
      textareaRef.current?.focus()
      router.refresh()
    })
  }, [text, extra, productId, type, activeType.extraField, activeType.saved, router])

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
          {CAPTURE_TYPES.map((t) => (
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

        {activeType.extraField && (
          <Input
            aria-label={activeType.extraField.label}
            placeholder={activeType.extraField.placeholder}
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
          />
        )}

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
          <Button
            type="button"
            disabled={
              isPending ||
              !text.trim() ||
              !productId ||
              Boolean(activeType.extraField && !extra.trim())
            }
            onClick={submit}
          >
            Сохранить
          </Button>
          <span className="font-mono text-[11px] text-muted-foreground">⌘↵</span>
          <Link
            href={fullFormHref(type, { productId, text, extra })}
            onClick={() => setOpen(false)}
            className="text-xs text-muted-foreground hover:underline"
          >
            Больше полей →
          </Link>
          {/* Quick capture is for one thought; a whole page of notes belongs
              in the Inbox, which types each line separately (B1). */}
          <Link
            href="/inbox"
            onClick={() => setOpen(false)}
            className="text-xs text-muted-foreground hover:underline"
          >
            Вставить много →
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
