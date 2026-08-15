'use client'

import { useEffect, useMemo, useState } from 'react'
import type { JTBD, Product, RTB } from '@prisma/client'
import { SubmitButton } from '@/components/shared/submit-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { getDefaultProductId, setDefaultProductId } from '@/lib/client-storage'

export interface FeatureFormValues {
  name?: string
  description?: string | null
  productId?: string
  jtbdIds?: string[]
  rtbIds?: string[]
}

export function FeatureForm({
  action,
  defaultValues,
  products,
  jtbds,
  rtbs,
  error,
  submitLabel,
  redirectTo,
}: {
  action: (formData: FormData) => void
  defaultValues?: FeatureFormValues
  products: Product[]
  jtbds: JTBD[]
  rtbs: RTB[]
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

  const productJtbds = useMemo(
    () => jtbds.filter((j) => j.productId === productId),
    [jtbds, productId]
  )
  const productRtbs = useMemo(
    () => rtbs.filter((r) => r.productId === productId),
    [rtbs, productId]
  )
  const selectedJtbdIds = defaultValues?.jtbdIds ?? []
  const selectedRtbIds = defaultValues?.rtbIds ?? []

  return (
    <form action={action} className="max-w-2xl space-y-4">
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
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
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Описание</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={defaultValues?.description ?? ''}
          />
        </div>
        <div className="space-y-2">
          <Label>Какие JTBD закрывает</Label>
          {productJtbds.length === 0 ? (
            <p className="text-sm text-muted-foreground">У выбранного продукта пока нет JTBD.</p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto rounded-md border p-2">
              {productJtbds.map((j) => (
                <label key={j.id} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="jtbdIds"
                    value={j.id}
                    defaultChecked={selectedJtbdIds.includes(j.id)}
                    className="mt-1 h-4 w-4 rounded border-input"
                  />
                  {j.title}
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label>Какие RTB опираются на эту фичу</Label>
          {productRtbs.length === 0 ? (
            <p className="text-sm text-muted-foreground">У выбранного продукта пока нет RTB.</p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto rounded-md border p-2">
              {productRtbs.map((r) => (
                <label key={r.id} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="rtbIds"
                    value={r.id}
                    defaultChecked={selectedRtbIds.includes(r.id)}
                    className="mt-1 h-4 w-4 rounded border-input"
                  />
                  {r.statement}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  )
}
