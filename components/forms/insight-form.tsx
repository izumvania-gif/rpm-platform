'use client'

import { useEffect, useMemo, useState } from 'react'
import type {
  Conversation,
  Hypothesis,
  InsightStance,
  JTBD,
  Product,
  Research,
  Segment,
} from '@prisma/client'
import { SubmitButton } from '@/components/shared/submit-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import {
  InlineCreateJtbd,
  InlineCreateResearch,
  InlineCreateSegment,
} from '@/components/shared/inline-create'
import { getDefaultProductId, setDefaultProductId } from '@/lib/client-storage'
import { insightStanceLabels, insightStanceOrder } from '@/lib/labels'
import { hypothesisKeyPhrase } from '@/lib/key-phrase'

export interface InsightFormValues {
  text?: string
  tags?: string[]
  productId?: string
  segmentId?: string | null
  jtbdId?: string | null
  researchId?: string | null
  conversationId?: string | null
  hypothesisId?: string | null
  stance?: InsightStance | null
}

export function InsightForm({
  action,
  defaultValues,
  products,
  segments,
  jtbds,
  researches,
  conversations,
  hypotheses,
  error,
  submitLabel,
  redirectTo,
}: {
  action: (formData: FormData) => void
  defaultValues?: InsightFormValues
  products: Product[]
  segments: Segment[]
  jtbds: JTBD[]
  researches: Research[]
  conversations: Conversation[]
  hypotheses: Hypothesis[]
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

  const [localSegments, setLocalSegments] = useState(segments)
  const [segmentId, setSegmentId] = useState(defaultValues?.segmentId ?? '')

  const productSegments = useMemo(
    () => localSegments.filter((s) => s.productId === productId),
    [localSegments, productId]
  )
  const [localJtbds, setLocalJtbds] = useState(jtbds)
  const [jtbdId, setJtbdId] = useState(defaultValues?.jtbdId ?? '')
  const productJtbds = useMemo(
    () => localJtbds.filter((j) => j.productId === productId),
    [localJtbds, productId]
  )
  const [localResearches, setLocalResearches] = useState(researches)
  const [researchId, setResearchId] = useState(defaultValues?.researchId ?? '')
  const productResearches = useMemo(
    () => localResearches.filter((r) => r.productId === productId),
    [localResearches, productId]
  )
  const productConversations = useMemo(
    () => conversations.filter((c) => c.productId === productId),
    [conversations, productId]
  )
  const productHypotheses = useMemo(
    () => hypotheses.filter((h) => h.productId === productId),
    [hypotheses, productId]
  )

  return (
    <form action={action} className="max-w-2xl space-y-4">
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="text">Цитата или вывод</Label>
          <Textarea id="text" name="text" required defaultValue={defaultValues?.text} />
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
          <Label htmlFor="segmentId">Сегмент</Label>
          <Select
            id="segmentId"
            name="segmentId"
            value={segmentId}
            onChange={(e) => setSegmentId(e.target.value)}
          >
            <option value="">Не указан</option>
            {productSegments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <InlineCreateSegment
            productId={productId}
            onCreated={(segment) => {
              setLocalSegments((prev) => [...prev, segment])
              setSegmentId(segment.id)
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="jtbdId">JTBD</Label>
          <Select
            id="jtbdId"
            name="jtbdId"
            value={jtbdId}
            onChange={(e) => setJtbdId(e.target.value)}
          >
            <option value="">Не указан</option>
            {productJtbds.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </Select>
          <InlineCreateJtbd
            productId={productId}
            onCreated={(jtbd) => {
              setLocalJtbds((prev) => [...prev, jtbd])
              setJtbdId(jtbd.id)
            }}
          />
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
        <div className="space-y-2">
          <Label htmlFor="conversationId">Разговор</Label>
          <Select
            id="conversationId"
            name="conversationId"
            defaultValue={defaultValues?.conversationId ?? ''}
          >
            <option value="">Не указан</option>
            {productConversations.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </Select>
        </div>
        {/* Гипотеза и сторона — одна мысль, поэтому стоят рядом. Сторона
            спрашивается, а не выводится из текста: определить «за» или
            «против» по формулировке значило бы угадать за пользователя, а
            полоса баланса на карточке гипотезы считает именно эти голоса. */}
        <div className="space-y-2">
          <Label htmlFor="hypothesisId">Гипотеза</Label>
          <Select
            id="hypothesisId"
            name="hypothesisId"
            defaultValue={defaultValues?.hypothesisId ?? ''}
          >
            <option value="">Не указана</option>
            {productHypotheses.map((h) => (
              <option key={h.id} value={h.id}>
                {hypothesisKeyPhrase(h.statement)}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="stance">Подтверждает или опровергает</Label>
          <Select id="stance" name="stance" defaultValue={defaultValues?.stance ?? ''}>
            <option value="">Не выбрано</option>
            {insightStanceOrder.map((s) => (
              <option key={s} value={s}>
                {insightStanceLabels[s]}
              </option>
            ))}
          </Select>
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
