'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  HypothesisStatus,
  type JTBD,
  type Product,
  type Research,
  type Segment,
} from '@prisma/client'
import { SubmitButton } from '@/components/shared/submit-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { InlineCreateSegment } from '@/components/shared/inline-create-segment'
import { hypothesisStatusLabels } from '@/lib/labels'
import { getDefaultProductId, setDefaultProductId } from '@/lib/client-storage'

export interface HypothesisFormValues {
  statement?: string
  status?: HypothesisStatus
  priority?: number | null
  tags?: string[]
  productId?: string
  jtbdId?: string | null
  segmentId?: string | null
  researchId?: string | null
}

export function HypothesisForm({
  action,
  defaultValues,
  products,
  jtbds,
  segments,
  researches,
  error,
  submitLabel,
}: {
  action: (formData: FormData) => void
  defaultValues?: HypothesisFormValues
  products: Product[]
  jtbds: JTBD[]
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

  const productJtbds = useMemo(
    () => jtbds.filter((j) => j.productId === productId),
    [jtbds, productId]
  )
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
        <Label htmlFor="statement">Формулировка гипотезы</Label>
        <Textarea
          id="statement"
          name="statement"
          required
          defaultValue={defaultValues?.statement}
        />
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
          <Label htmlFor="status">Статус</Label>
          <Select
            id="status"
            name="status"
            defaultValue={defaultValues?.status ?? HypothesisStatus.DRAFT}
          >
            {Object.values(HypothesisStatus).map((status) => (
              <option key={status} value={status}>
                {hypothesisStatusLabels[status]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="priority">Приоритет</Label>
          <Input
            id="priority"
            name="priority"
            type="number"
            defaultValue={defaultValues?.priority ?? undefined}
          />
        </div>
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
        <Label htmlFor="tags">Теги (через запятую)</Label>
        <Input id="tags" name="tags" defaultValue={defaultValues?.tags?.join(', ')} />
      </div>
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  )
}
