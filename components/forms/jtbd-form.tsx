'use client'

import { useMemo, useState } from 'react'
import type { Product, Research, Segment } from '@prisma/client'
import { SubmitButton } from '@/components/shared/submit-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'

export interface JtbdFormValues {
  title?: string
  category?: string
  description?: string | null
  confirmed?: boolean
  productId?: string
  segmentId?: string | null
  researchId?: string | null
}

export function JtbdForm({
  action,
  defaultValues,
  products,
  segments,
  researches,
  categories,
  error,
  submitLabel,
}: {
  action: (formData: FormData) => void
  defaultValues?: JtbdFormValues
  products: Product[]
  segments: Segment[]
  researches: Research[]
  categories: string[]
  error?: string
  submitLabel: string
}) {
  const [productId, setProductId] = useState(defaultValues?.productId ?? '')

  const productSegments = useMemo(
    () => segments.filter((s) => s.productId === productId),
    [segments, productId]
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
        <Label htmlFor="title">Формулировка JTBD</Label>
        <Textarea
          id="title"
          name="title"
          required
          placeholder="Когда ..., я хочу ..., чтобы ..."
          defaultValue={defaultValues?.title}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">Категория</Label>
        <Input
          id="category"
          name="category"
          required
          list="jtbd-categories"
          defaultValue={defaultValues?.category}
        />
        <datalist id="jtbd-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
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
          <Select id="segmentId" name="segmentId" defaultValue={defaultValues?.segmentId ?? ''}>
            <option value="">Не указан</option>
            {productSegments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
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
      </div>
      <div className="flex items-center gap-2">
        <input
          id="confirmed"
          name="confirmed"
          type="checkbox"
          defaultChecked={defaultValues?.confirmed}
          className="h-4 w-4 rounded border-input"
        />
        <Label htmlFor="confirmed">Подтверждено исследованием</Label>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Комментарий</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={defaultValues?.description ?? ''}
        />
      </div>
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  )
}
