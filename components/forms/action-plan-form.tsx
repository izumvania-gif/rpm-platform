'use client'

import Link from 'next/link'
import type { Person, ProcessStep } from '@prisma/client'
import { SubmitButton } from '@/components/shared/submit-button'
import { buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'

export interface ActionPlanFormValues {
  scenario?: string
  trigger?: string | null
  steps?: string[]
  tags?: string[]
  ownerId?: string | null
  processStepId?: string | null
}

export function ActionPlanForm({
  action,
  productId,
  productName,
  people,
  processSteps,
  defaultValues,
  error,
  submitLabel,
  cancelHref,
}: {
  action: (formData: FormData) => void
  productId: string
  productName: string
  people: Person[]
  processSteps: ProcessStep[]
  defaultValues?: ActionPlanFormValues
  error?: string
  submitLabel: string
  cancelHref: string
}) {
  return (
    <form action={action} className="max-w-2xl space-y-4">
      <input type="hidden" name="productId" value={productId} />
      <p className="text-sm text-muted-foreground">
        Продукт: <span className="font-medium text-foreground">{productName}</span>
      </p>
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="scenario">Сценарий</Label>
          <Input
            id="scenario"
            name="scenario"
            required
            placeholder="Клиент публично жалуется в соцсетях"
            defaultValue={defaultValues?.scenario}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="trigger">Как понять, что сценарий наступил</Label>
          <Textarea id="trigger" name="trigger" defaultValue={defaultValues?.trigger ?? ''} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="steps">Шаги (по одному на строку)</Label>
          <Textarea
            id="steps"
            name="steps"
            rows={5}
            placeholder={'Оценить масштаб\nСвязаться с клиентом лично\nПодготовить публичный ответ'}
            defaultValue={defaultValues?.steps?.join('\n')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ownerId">Кто координирует реакцию</Label>
          <Select id="ownerId" name="ownerId" defaultValue={defaultValues?.ownerId ?? ''}>
            <option value="">Не указан</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="processStepId">Относится к шагу процесса</Label>
          <Select
            id="processStepId"
            name="processStepId"
            defaultValue={defaultValues?.processStepId ?? ''}
          >
            <option value="">Не указан</option>
            {processSteps.map((step) => (
              <option key={step.id} value={step.id}>
                {step.title}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="tags">Категории (через запятую)</Label>
          <Input
            id="tags"
            name="tags"
            placeholder="PR-кризис, срыв дедлайна"
            defaultValue={defaultValues?.tags?.join(', ')}
          />
        </div>
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
