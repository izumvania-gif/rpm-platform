'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Conversation, JTBD, Product, Research, Segment } from '@prisma/client'
import { SubmitButton } from '@/components/shared/submit-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { InlineCreateSegment } from '@/components/shared/inline-create-segment'
import { getDefaultProductId, setDefaultProductId } from '@/lib/client-storage'

export interface InsightFormValues {
  text?: string
  tags?: string[]
  productId?: string
  segmentId?: string | null
  jtbdId?: string | null
  researchId?: string | null
  conversationId?: string | null
}

export function InsightForm({
  action,
  defaultValues,
  products,
  segments,
  jtbds,
  researches,
  conversations,
  error,
  submitLabel,
}: {
  action: (formData: FormData) => void
  defaultValues?: InsightFormValues
  products: Product[]
  segments: Segment[]
  jtbds: JTBD[]
  researches: Research[]
  conversations: Conversation[]
  error?: string
  submitLabel: string
}) {
  const [productId, setProductId] = useState(defaultValues?.productId ?? '')

  useEffect(() => {
    if (!defaultValues?.productId) {
      const stored = getDefaultProductId()
      if (stored && products.some((p) => p.id === stored)) setProductId(stored)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (productId) setDefaultProductId(productId)
  }, [productId])

  const [localSegments, setLocalSegments] = useState(segments)
  const [segmentId, setSegmentId] = useState(defaultValues?.segmentId ?? '')

  const productSegments = useMemo(
    () => localSegments.filter((s) => s.productId === productId),
    [localSegments, productId]
  )
  const productJtbds = useMemo(
    () => jtbds.filter((j) => j.productId === productId),
    [jtbds, productId]
  )
  const productResearches = useMemo(
    () => researches.filter((r) => r.productId === productId),
    [researches, productId]
  )
  const productConversations = useMemo(
    () => conversations.filter((c) => c.productId === productId),
    [conversations, productId]
  )

  return (
    <form action={action} className="max-w-2xl space-y-4">
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="text">Цитата или вывод</Label>
          <Textarea id="text" name="text" required defaultValue={defaultValues?.text} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="productId">Продукт</Label>
          <Select
            id="productId"
            name="productId"
            required
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            <option value="" disabled>
              Выберите продукт
            </option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="segmentId">Сегмент</Label>
          <Select
            id="segmentId"
            name="segmentId"
            value={segmentId}
            onChange={(e) => setSegmentId(e.target.value)}
          >
            <option value="">Не указан</option>
            {productSegments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <InlineCreateSegment
            productId={productId}
            onCreated={(segment) => {
              setLocalSegments((prev) => [...prev, segment])
              setSegmentId(segment.id)
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="jtbdId">JTBD</Label>
          <Select id="jtbdId" name="jtbdId" defaultValue={defaultValues?.jtbdId ?? ''}>
            <option value="">Не указан</option>
            {productJtbds.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="researchId">Исследование</Label>
          <Select id="researchId" name="researchId" defaultValue={defaultValues?.researchId ?? ''}>
            <option value="">Не указано</option>
            {productResearches.map((r) => (
              <option key={r.id} value={r.id}>
                #{r.number} {r.title}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="conversationId">Разговор</Label>
          <Select
            id="conversationId"
            name="conversationId"
            defaultValue={defaultValues?.conversationId ?? ''}
          >
            <option value="">Не указан</option>
            {productConversations.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="tags">Теги (через запятую)</Label>
          <Input id="tags" name="tags" defaultValue={defaultValues?.tags?.join(', ')} />
        </div>
      </div>
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  )
}
