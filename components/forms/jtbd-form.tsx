'use client'

import { useEffect, useMemo, useState } from 'react'
import { JtbdJobType, type Product, type Research, type Segment } from '@prisma/client'
import { SubmitButton } from '@/components/shared/submit-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { InlineCreateResearch, InlineCreateSegment } from '@/components/shared/inline-create'
import { getDefaultProductId, setDefaultProductId } from '@/lib/client-storage'
import { jtbdJobTypeDescriptions, jtbdJobTypeLabels, jtbdJobTypeOrder } from '@/lib/jtbd-job-types'

export interface JtbdFormValues {
  title?: string
  category?: string
  description?: string | null
  jobType?: JtbdJobType
  confirmed?: boolean
  tags?: string[]
  productId?: string
  segmentIds?: string[]
  researchId?: string | null
}

export function JtbdForm({
  action,
  defaultValues,
  products,
  segments,
  researches,
  categories,
  error,
  submitLabel,
  redirectTo,
}: {
  action: (formData: FormData) => void
  defaultValues?: JtbdFormValues
  products: Product[]
  segments: Segment[]
  researches: Research[]
  categories: string[]
  error?: string
  submitLabel: string
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

  const [localSegments, setLocalSegments] = useState(segments)
  const [localResearches, setLocalResearches] = useState(researches)
  // Controlled so an inline-created study can be selected the moment it exists.
  const [researchId, setResearchId] = useState(defaultValues?.researchId ?? '')
  const [segmentIds, setSegmentIds] = useState<string[]>(defaultValues?.segmentIds ?? [])
  const [jobType, setJobType] = useState<JtbdJobType>(
    defaultValues?.jobType ?? JtbdJobType.SMALL_JOB
  )

  const productSegments = useMemo(
    () => localSegments.filter((s) => s.productId === productId),
    [localSegments, productId]
  )
  const productResearches = useMemo(
    () => localResearches.filter((r) => r.productId === productId),
    [localResearches, productId]
  )

  return (
    <form action={action} className="max-w-2xl space-y-4">
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="title">Формулировка JTBD</Label>
          <Textarea
            id="title"
            name="title"
            required
            placeholder="Когда ..., я хочу ..., чтобы ..."
            defaultValue={defaultValues?.title}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Категория</Label>
          <Input
            id="category"
            name="category"
            required
            list="jtbd-categories"
            defaultValue={defaultValues?.category}
          />
          <datalist id="jtbd-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className="space-y-2">
          <Label htmlFor="jobType">Тип задачи</Label>
          <Select
            id="jobType"
            name="jobType"
            value={jobType}
            onChange={(e) => setJobType(e.target.value as JtbdJobType)}
          >
            {jtbdJobTypeOrder.map((type) => (
              <option key={type} value={type}>
                {jtbdJobTypeLabels[type]}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">{jtbdJobTypeDescriptions[jobType]}</p>
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
          <Label htmlFor="researchId">Исследование</Label>
          <Select
            id="researchId"
            name="researchId"
            value={researchId}
            onChange={(e) => setResearchId(e.target.value)}
          >
            <option value="">Не указано</option>
            {productResearches.map((r) => (
              <option key={r.id} value={r.id}>
                #{r.number} {r.title}
              </option>
            ))}
          </Select>
          <InlineCreateResearch
            productId={productId}
            onCreated={(research) => {
              setLocalResearches((prev) => [...prev, research])
              setResearchId(research.id)
            }}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Сегменты</Label>
          <p className="text-xs text-muted-foreground">
            Можно выбрать несколько — у каждого сегмента будет свой независимый граф JTBD с
            собственной раскладкой узлов.
          </p>
          {productSegments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              У выбранного продукта пока нет сегментов.
            </p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto rounded-md border p-2">
              {productSegments.map((s) => (
                <label key={s.id} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="segmentIds"
                    value={s.id}
                    defaultChecked={segmentIds.includes(s.id)}
                    onChange={(e) => {
                      setSegmentIds((prev) =>
                        e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id)
                      )
                    }}
                    className="mt-1 h-4 w-4 rounded border-input"
                  />
                  {s.name}
                </label>
              ))}
            </div>
          )}
          <InlineCreateSegment
            productId={productId}
            onCreated={(segment) => {
              setLocalSegments((prev) => [...prev, segment])
              setSegmentIds((prev) => [...prev, segment.id])
            }}
          />
        </div>
        <div className="flex items-center gap-2 sm:col-span-2">
          <input
            id="confirmed"
            name="confirmed"
            type="checkbox"
            defaultChecked={defaultValues?.confirmed}
            className="h-4 w-4 rounded border-input"
          />
          <Label htmlFor="confirmed">Подтверждено исследованием</Label>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Комментарий</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={defaultValues?.description ?? ''}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="tags">Теги (через запятую)</Label>
          <Input id="tags" name="tags" defaultValue={defaultValues?.tags?.join(', ')} />
        </div>
      </div>
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  )
}
