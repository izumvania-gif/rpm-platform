'use client'

import { useEffect, useState } from 'react'
import { ResearchStatus, ResearchType, type Product } from '@prisma/client'
import { SubmitButton } from '@/components/shared/submit-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { statusLabels, typeLabels } from '@/lib/labels'
import { getDefaultProductId, setDefaultProductId } from '@/lib/client-storage'

export interface ResearchFormValues {
  title?: string
  description?: string | null
  date?: Date
  status?: ResearchStatus
  type?: ResearchType
  tags?: string[]
  productId?: string
}

function toDateInputValue(date?: Date) {
  const d = date ?? new Date()
  return d.toISOString().slice(0, 10)
}

export function ResearchForm({
  action,
  defaultValues,
  products,
  error,
  submitLabel,
  redirectTo,
}: {
  action: (formData: FormData) => void
  defaultValues?: ResearchFormValues
  products: Product[]
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

  return (
    <form action={action} className="max-w-2xl space-y-4">
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
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
          <Label htmlFor="date">Дата</Label>
          <Input
            id="date"
            name="date"
            type="date"
            defaultValue={toDateInputValue(defaultValues?.date)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Тип</Label>
          <Select id="type" name="type" defaultValue={defaultValues?.type ?? ResearchType.MANUAL}>
            {Object.values(ResearchType).map((type) => (
              <option key={type} value={type}>
                {typeLabels[type]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Статус</Label>
          <Select
            id="status"
            name="status"
            defaultValue={defaultValues?.status ?? ResearchStatus.IN_PROGRESS}
          >
            {Object.values(ResearchStatus).map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </Select>
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
