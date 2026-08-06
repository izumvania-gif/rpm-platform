'use client'

import { ResearchStatus, ResearchType, type Product } from '@prisma/client'
import { SubmitButton } from '@/components/shared/submit-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { statusLabels, typeLabels } from '@/lib/labels'

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
}: {
  action: (formData: FormData) => void
  defaultValues?: ResearchFormValues
  products: Product[]
  error?: string
  submitLabel: string
}) {
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
