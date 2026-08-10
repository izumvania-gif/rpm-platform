'use client'

import Link from 'next/link'
import type { Feature, JTBD, Person } from '@prisma/client'
import { RoadmapStatus, RoadmapVisibility } from '@prisma/client'
import { SubmitButton } from '@/components/shared/submit-button'
import { buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { roadmapStatusLabels } from '@/lib/labels'

export interface RoadmapItemFormValues {
  title?: string
  description?: string | null
  status?: RoadmapStatus
  quarter?: string | null
  visibility?: RoadmapVisibility
  ownerId?: string | null
  featureId?: string | null
  jtbdId?: string | null
  trackGroup?: string | null
  track?: string | null
  startDate?: Date | string | null
  endDate?: Date | string | null
  isMilestone?: boolean
}

const visibilityLabels: Record<RoadmapVisibility, string> = {
  INTERNAL: 'Внутренний',
  PUBLIC: 'Публичный (виден на открытом дашборде компании)',
}

// <input type="date"> needs "YYYY-MM-DD" — defaultValues comes straight from
// a Prisma row (a real Date) on the edit form, or is absent on the create
// form, so this normalizes either case.
function toDateInputValue(date?: Date | string | null): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString().slice(0, 10)
}

export function RoadmapItemForm({
  action,
  productId,
  productName,
  people,
  features,
  jtbds,
  defaultValues,
  error,
  submitLabel,
  cancelHref,
}: {
  action: (formData: FormData) => void
  productId: string
  productName: string
  people: Person[]
  features: Feature[]
  jtbds: JTBD[]
  defaultValues?: RoadmapItemFormValues
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
          <Label htmlFor="title">Название</Label>
          <Input id="title" name="title" required defaultValue={defaultValues?.title} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Статус</Label>
          <Select
            id="status"
            name="status"
            defaultValue={defaultValues?.status ?? RoadmapStatus.PLANNED}
          >
            {Object.values(RoadmapStatus).map((status) => (
              <option key={status} value={status}>
                {roadmapStatusLabels[status]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="quarter">Квартал</Label>
          <Input
            id="quarter"
            name="quarter"
            placeholder="2026 Q3"
            defaultValue={defaultValues?.quarter ?? ''}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="visibility">Видимость</Label>
          <Select
            id="visibility"
            name="visibility"
            defaultValue={defaultValues?.visibility ?? RoadmapVisibility.INTERNAL}
          >
            {Object.values(RoadmapVisibility).map((visibility) => (
              <option key={visibility} value={visibility}>
                {visibilityLabels[visibility]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ownerId">Ответственный</Label>
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
          <Label htmlFor="featureId">Связанная фича</Label>
          <Select id="featureId" name="featureId" defaultValue={defaultValues?.featureId ?? ''}>
            <option value="">Не указана</option>
            {features.map((feature) => (
              <option key={feature.id} value={feature.id}>
                {feature.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="jtbdId">Связанный JTBD</Label>
          <Select id="jtbdId" name="jtbdId" defaultValue={defaultValues?.jtbdId ?? ''}>
            <option value="">Не указан</option>
            {jtbds.map((jtbd) => (
              <option key={jtbd.id} value={jtbd.id}>
                {jtbd.title}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="trackGroup">Блок (группа дорожек)</Label>
          <Input
            id="trackGroup"
            name="trackGroup"
            placeholder="Разработка"
            defaultValue={defaultValues?.trackGroup ?? ''}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="track">Дорожка</Label>
          <Input
            id="track"
            name="track"
            placeholder="Фронт"
            defaultValue={defaultValues?.track ?? ''}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="startDate">Начало</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={toDateInputValue(defaultValues?.startDate)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">Конец</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={toDateInputValue(defaultValues?.endDate)}
          />
        </div>
        <div className="flex items-start gap-2 sm:col-span-2">
          <input
            id="isMilestone"
            name="isMilestone"
            type="checkbox"
            defaultChecked={defaultValues?.isMilestone}
            className="mt-1 h-4 w-4 rounded border-input"
          />
          <Label htmlFor="isMilestone" className="font-normal">
            Это веха (например, выпуск версии) — на диаграмме Ганта рисуется вертикальной линией по
            дате «Начало», а не полосой; блок, дорожка и «Конец» для вехи не используются
          </Label>
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
      <div className="flex items-center gap-3">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link href={cancelHref} className={buttonVariants({ variant: 'outline' })}>
          Отмена
        </Link>
      </div>
    </form>
  )
}
