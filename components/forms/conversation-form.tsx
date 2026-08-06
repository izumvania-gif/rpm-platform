'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Product, Research, Segment } from '@prisma/client'
import { SubmitButton } from '@/components/shared/submit-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { InlineCreateSegment } from '@/components/shared/inline-create-segment'
import { getDefaultProductId, setDefaultProductId } from '@/lib/client-storage'

export interface ConversationFormValues {
  title?: string
  transcript?: string | null
  date?: Date
  tags?: string[]
  productId?: string
  segmentId?: string | null
  researchId?: string | null
}

function toDateInputValue(date?: Date) {
  const d = date ?? new Date()
  return d.toISOString().slice(0, 10)
}

export function ConversationForm({
  action,
  defaultValues,
  products,
  segments,
  researches,
  error,
  submitLabel,
}: {
  action: (formData: FormData) => void
  defaultValues?: ConversationFormValues
  products: Product[]
  segments: Segment[]
  researches: Research[]
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
  const productResearches = useMemo(
    () => researches.filter((r) => r.productId === productId),
    [researches, productId]
  )

  return (
    <form action={action} className="space-y-4 max-w-xl">
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
      <div className="space-y-2">
        <Label htmlFor="title">Название</Label>
        <Input id="title" name="title" required defaultValue={defaultValues?.title} />
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
      <div className="grid grid-cols-2 gap-4">
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
      </div>
      <div className="space-y-2">
        <Label htmlFor="date">Дата</Label>
        <Input
          id="date"
          name="date"
          type="date"
          defaultValue={toDateInputValue(defaultValues?.date)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tags">Теги (через запятую)</Label>
        <Input id="tags" name="tags" defaultValue={defaultValues?.tags?.join(', ')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="transcript">Транскрипт / заметки</Label>
        <Textarea
          id="transcript"
          name="transcript"
          rows={8}
          defaultValue={defaultValues?.transcript ?? ''}
        />
      </div>
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  )
}
