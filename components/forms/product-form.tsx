'use client'

import { useState } from 'react'
import { Stage, type Department, type Person } from '@prisma/client'
import { SubmitButton } from '@/components/shared/submit-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { slugify } from '@/lib/utils'
import { stageLabels } from '@/lib/labels'

export interface ProductFormValues {
  name?: string
  slug?: string
  description?: string | null
  stage?: Stage
  ownerId?: string | null
  publicSummary?: string | null
  departmentId?: string | null
}

export function ProductForm({
  action,
  defaultValues,
  error,
  submitLabel,
  showOnboardingOption,
  people = [],
  departments = [],
}: {
  action: (formData: FormData) => void
  defaultValues?: ProductFormValues
  error?: string
  submitLabel: string
  showOnboardingOption?: boolean
  people?: Person[]
  departments?: Department[]
}) {
  const [slugTouched, setSlugTouched] = useState(Boolean(defaultValues?.slug))
  const [slug, setSlug] = useState(defaultValues?.slug ?? '')

  return (
    <form action={action} className="max-w-2xl space-y-4">
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
          <Label htmlFor="stage">Стадия</Label>
          <Select id="stage" name="stage" defaultValue={defaultValues?.stage ?? Stage.IDEA}>
            {Object.values(Stage).map((stage) => (
              <option key={stage} value={stage}>
                {stageLabels[stage]}
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
          <Label htmlFor="ownerId">Ответственный PM</Label>
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
          <Label htmlFor="departmentId">Департамент</Label>
          <Select
            id="departmentId"
            name="departmentId"
            defaultValue={defaultValues?.departmentId ?? ''}
          >
            <option value="">Без департамента</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="publicSummary">
            Публичное описание (для открытого дашборда компании)
          </Label>
          <Textarea
            id="publicSummary"
            name="publicSummary"
            placeholder="Что продукт делает для клиента, одним-двумя предложениями"
            defaultValue={defaultValues?.publicSummary ?? ''}
          />
        </div>
      </div>
      {showOnboardingOption ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <SubmitButton name="mode" value="direct" variant="outline">
              {submitLabel}
            </SubmitButton>
            <SubmitButton name="mode" value="onboarding">
              {submitLabel} и настроить →
            </SubmitButton>
          </div>
          <p className="text-xs text-muted-foreground">
            «{submitLabel} и настроить» проведёт по коротким шагам: сегменты, задачи клиентов,
            исследования, гипотезы, конкуренты, фичи — удобно для совсем нового продукта.
          </p>
        </div>
      ) : (
        <SubmitButton>{submitLabel}</SubmitButton>
      )}
    </form>
  )
}
