'use client'

import { useState } from 'react'
import type { Product } from '@prisma/client'
import { SubmitButton } from '@/components/shared/submit-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { slugify } from '@/lib/utils'

export interface SegmentFormValues {
  name?: string
  slug?: string
  audienceShare?: number | null
  color?: string
  description?: string | null
  productId?: string
}

export function SegmentForm({
  action,
  defaultValues,
  products,
  error,
  submitLabel,
}: {
  action: (formData: FormData) => void
  defaultValues?: SegmentFormValues
  products: Product[]
  error?: string
  submitLabel: string
}) {
  const [slugTouched, setSlugTouched] = useState(Boolean(defaultValues?.slug))
  const [slug, setSlug] = useState(defaultValues?.slug ?? '')

  return (
    <form action={action} className="space-y-4 max-w-xl">
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
      <div className="space-y-2">
        <Label htmlFor="name">Название</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={defaultValues?.name}
          onChange={(e) => {
            if (!slugTouched) setSlug(slugify(e.target.value))
          }}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="slug">Slug (eng)</Label>
        <Input
          id="slug"
          name="slug"
          required
          value={slug}
          onChange={(e) => {
            setSlugTouched(true)
            setSlug(e.target.value)
          }}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="productId">Продукт</Label>
        <Select id="productId" name="productId" required defaultValue={defaultValues?.productId}>
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
          <Label htmlFor="audienceShare">Доля аудитории (%)</Label>
          <Input
            id="audienceShare"
            name="audienceShare"
            type="number"
            min={0}
            max={100}
            step="0.1"
            defaultValue={defaultValues?.audienceShare ?? undefined}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="color">Цвет</Label>
          <Input
            id="color"
            name="color"
            type="color"
            defaultValue={defaultValues?.color ?? '#3B82F6'}
            className="h-10 px-1"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Описание</Label>
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
