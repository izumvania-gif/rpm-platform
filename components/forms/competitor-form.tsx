'use client'

import { useEffect, useState } from 'react'
import type { Product } from '@prisma/client'
import { SubmitButton } from '@/components/shared/submit-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { getDefaultProductId, setDefaultProductId } from '@/lib/client-storage'

export interface CompetitorFormValues {
  name?: string
  url?: string | null
  positioning?: string | null
  features?: string[]
  productId?: string
}

export function CompetitorForm({
  action,
  defaultValues,
  products,
  error,
  submitLabel,
}: {
  action: (formData: FormData) => void
  defaultValues?: CompetitorFormValues
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
    <form action={action} className="space-y-4 max-w-xl">
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
      <div className="space-y-2">
        <Label htmlFor="name">Название</Label>
        <Input id="name" name="name" required defaultValue={defaultValues?.name} />
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
        <Label htmlFor="url">Сайт</Label>
        <Input id="url" name="url" type="url" defaultValue={defaultValues?.url ?? ''} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="positioning">Позиционирование</Label>
        <Textarea
          id="positioning"
          name="positioning"
          defaultValue={defaultValues?.positioning ?? ''}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="features">Фичи конкурента (через запятую)</Label>
        <Input id="features" name="features" defaultValue={defaultValues?.features?.join(', ')} />
      </div>
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  )
}
