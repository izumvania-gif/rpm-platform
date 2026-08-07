'use client'

import { useEffect, useState } from 'react'
import { ProductResourceKind, type Product } from '@prisma/client'
import { SubmitButton } from '@/components/shared/submit-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { productResourceKindLabels } from '@/lib/labels'
import { getDefaultProductId, setDefaultProductId } from '@/lib/client-storage'

export interface ProductResourceFormValues {
  title?: string
  kind?: ProductResourceKind
  url?: string | null
  description?: string | null
  productId?: string
}

export function ProductResourceForm({
  action,
  defaultValues,
  products,
  error,
  submitLabel,
}: {
  action: (formData: FormData) => void
  defaultValues?: ProductResourceFormValues
  products: Product[]
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

  return (
    <form action={action} className="max-w-2xl space-y-4">
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
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
        <div className="space-y-2">
          <Label htmlFor="kind">Тип</Label>
          <Select
            id="kind"
            name="kind"
            defaultValue={defaultValues?.kind ?? ProductResourceKind.OTHER}
          >
            {Object.values(ProductResourceKind).map((kind) => (
              <option key={kind} value={kind}>
                {productResourceKindLabels[kind]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="url">Ссылка</Label>
          <Input id="url" name="url" type="url" defaultValue={defaultValues?.url ?? ''} />
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
