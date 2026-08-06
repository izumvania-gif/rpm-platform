'use client'

import { useState } from 'react'
import { Stage } from '@prisma/client'
import { Button } from '@/components/ui/button'
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
}

export function ProductForm({
  action,
  defaultValues,
  error,
  submitLabel,
}: {
  action: (formData: FormData) => void
  defaultValues?: ProductFormValues
  error?: string
  submitLabel: string
}) {
  const [slugTouched, setSlugTouched] = useState(Boolean(defaultValues?.slug))
  const [slug, setSlug] = useState(defaultValues?.slug ?? '')

  return (
    <form action={action} className="space-y-4 max-w-xl">
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
      <div className="space-y-2">
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
      <div className="space-y-2">
        <Label htmlFor="description">Описание</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={defaultValues?.description ?? ''}
        />
      </div>
      <Button type="submit">{submitLabel}</Button>
    </form>
  )
}
