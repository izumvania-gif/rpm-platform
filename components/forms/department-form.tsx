'use client'

import { SubmitButton } from '@/components/shared/submit-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export interface DepartmentFormValues {
  name?: string
  color?: string
  description?: string | null
}

export function DepartmentForm({
  action,
  defaultValues,
  error,
  submitLabel,
}: {
  action: (formData: FormData) => void
  defaultValues?: DepartmentFormValues
  error?: string
  submitLabel: string
}) {
  return (
    <form action={action} className="max-w-2xl space-y-4">
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Название</Label>
          <Input
            id="name"
            name="name"
            required
            placeholder="Например: MFA-продукты"
            defaultValue={defaultValues?.name}
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
