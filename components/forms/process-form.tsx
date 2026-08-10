'use client'

import Link from 'next/link'
import { SubmitButton } from '@/components/shared/submit-button'
import { buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface ProcessFormValues {
  title?: string
}

export function ProcessForm({
  action,
  productId,
  productName,
  defaultValues,
  error,
  submitLabel,
  cancelHref,
}: {
  action: (formData: FormData) => void
  productId: string
  productName: string
  defaultValues?: ProcessFormValues
  error?: string
  submitLabel: string
  cancelHref: string
}) {
  return (
    <form action={action} className="max-w-2xl space-y-4">
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
      <input type="hidden" name="productId" value={productId} />
      <p className="text-sm text-muted-foreground">Продукт: {productName}</p>
      <div className="space-y-2">
        <Label htmlFor="title">Название процесса</Label>
        <Input
          id="title"
          name="title"
          required
          placeholder="Например: Запуск маркетинговой кампании"
          defaultValue={defaultValues?.title}
        />
      </div>
      <div className="flex items-center gap-3">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link href={cancelHref} className={buttonVariants({ variant: 'outline' })}>
          Отмена
        </Link>
      </div>
    </form>
  )
}
