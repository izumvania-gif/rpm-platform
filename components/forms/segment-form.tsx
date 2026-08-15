'use client'

import { useEffect, useState } from 'react'
import type { Product } from '@prisma/client'
import { SubmitButton } from '@/components/shared/submit-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { slugify } from '@/lib/utils'
import { getDefaultProductId, setDefaultProductId } from '@/lib/client-storage'

export interface SegmentFormValues {
  name?: string
  slug?: string
  audienceShare?: number | null
  color?: string
  description?: string | null
  tags?: string[]
  productId?: string
}

export function SegmentForm({
  action,
  defaultValues,
  products,
  error,
  submitLabel,
  redirectTo,
}: {
  action: (formData: FormData) => void
  defaultValues?: SegmentFormValues
  products: Product[]
  error?: string
  submitLabel: string
  /** Where to land after saving; the action falls back to its own page. */
  redirectTo?: string
}) {
  const [slugTouched, setSlugTouched] = useState(Boolean(defaultValues?.slug))
  const [slug, setSlug] = useState(defaultValues?.slug ?? '')
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

  return (
    <form action={action} className="max-w-2xl space-y-4">
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
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
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="tags">Теги (через запятую)</Label>
          <Input id="tags" name="tags" defaultValue={defaultValues?.tags?.join(', ')} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Описание</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={defaultValues?.description ?? ''}
          />
        </div>
      </div>
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  )
}
