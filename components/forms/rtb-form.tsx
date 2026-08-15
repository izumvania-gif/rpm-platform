'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Feature, Product } from '@prisma/client'
import { SubmitButton } from '@/components/shared/submit-button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { getDefaultProductId, setDefaultProductId } from '@/lib/client-storage'

export interface RTBFormValues {
  statement?: string
  productId?: string
  featureIds?: string[]
}

export function RTBForm({
  action,
  defaultValues,
  products,
  features,
  error,
  submitLabel,
  redirectTo,
}: {
  action: (formData: FormData) => void
  defaultValues?: RTBFormValues
  products: Product[]
  features: Feature[]
  error?: string
  submitLabel: string
  /** Where to land after saving; the action falls back to its own page. */
  redirectTo?: string
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

  const productFeatures = useMemo(
    () => features.filter((f) => f.productId === productId),
    [features, productId]
  )
  const selectedFeatureIds = defaultValues?.featureIds ?? []

  return (
    <form action={action} className="space-y-4 max-w-xl">
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
      <div className="space-y-2">
        <Label htmlFor="statement">Формулировка обещания</Label>
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
      <div className="space-y-2">
        <Label>На каких фичах основано</Label>
        {productFeatures.length === 0 ? (
          <p className="text-sm text-muted-foreground">У выбранного продукта пока нет фич.</p>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto rounded-md border p-2">
            {productFeatures.map((f) => (
              <label key={f.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  name="featureIds"
                  value={f.id}
                  defaultChecked={selectedFeatureIds.includes(f.id)}
                  className="mt-1 h-4 w-4 rounded border-input"
                />
                {f.name}
              </label>
            ))}
          </div>
        )}
      </div>
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  )
}
