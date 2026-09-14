'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  InsightStance,
  type Hypothesis,
  type Insight,
  type JTBD,
  type Segment,
} from '@prisma/client'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { InlineEditableField } from '@/components/shared/inline-editable-field'
import { createInsightQuick, updateInsightField } from '@/lib/actions/insights'
import { hypothesisKeyPhrase, insightKeyPhrase, jtbdKeyPhrase } from '@/lib/key-phrase'
import { insightStanceLabels } from '@/lib/labels'

export function QuickAddInsight({
  productId,
  researchId,
  conversationId,
  segments,
  jtbds,
  hypotheses,
  initialInsights,
}: {
  productId: string
  researchId?: string
  conversationId?: string
  segments: Segment[]
  jtbds: JTBD[]
  hypotheses: Hypothesis[]
  initialInsights: Insight[]
}) {
  // Список — серверный список плюс добавленное здесь, а не копия в useState
  // (план 2.4, найдено замером сценария «после звонка»): карточка разговора
  // рядом с этой формой принимает подсказки «В инсайты» и делает
  // router.refresh(), после которого сервер присылает новый initialInsights —
  // а useState(initialInsights) брал проп один раз, и принятый инсайт не
  // появлялся в списке до перезагрузки страницы, хотя счётчик в заголовке
  // уже показывал единицу.
  const [added, setAdded] = useState<Insight[]>([])
  const insights = [
    ...initialInsights,
    ...added.filter((a) => !initialInsights.some((i) => i.id === a.id)),
  ]
  const [text, setText] = useState('')
  const [segmentId, setSegmentId] = useState('')
  const [jtbdId, setJtbdId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Пикеры в строках (фаза 24 плана 2.4). Замер сценария «после звонка»
  // показал 11 переходов, и четыре из них — на каждый инсайт: чтобы привязать
  // цитату к задаче или гипотезе, надо было открыть инсайт, перейти в форму,
  // сохранить, вернуться. Здесь та же связь ставится на месте тем же
  // updateInsightField, что и на карточке инсайта.
  const jtbdOptions = [
    { value: '', label: '— без задачи' },
    ...jtbds.map((j) => ({ value: j.id, label: jtbdKeyPhrase(j.title) })),
  ]
  const jtbdLabels = Object.fromEntries(jtbds.map((j) => [j.id, jtbdKeyPhrase(j.title)]))
  const hypothesisOptions = [
    { value: '', label: '— без гипотезы' },
    ...hypotheses.map((h) => ({ value: h.id, label: hypothesisKeyPhrase(h.statement) })),
  ]
  const hypothesisLabels = Object.fromEntries(
    hypotheses.map((h) => [h.id, hypothesisKeyPhrase(h.statement)])
  )
  const stanceOptions = [
    { value: '', label: 'Без стороны' },
    ...Object.values(InsightStance).map((value) => ({ value, label: insightStanceLabels[value] })),
  ]

  function submit() {
    if (!text.trim()) return
    startTransition(async () => {
      const result = await createInsightQuick(
        productId,
        text,
        segmentId || null,
        jtbdId || null,
        researchId || null,
        conversationId || null
      )
      if (!result.ok) {
        setError(result.error)
        return
      }
      setAdded((prev) => [...prev, result.insight])
      setText('')
      setSegmentId('')
      setJtbdId('')
      setError(null)
    })
  }

  return (
    <div className="space-y-3">
      {insights.length === 0 ? (
        <p className="text-sm text-muted-foreground">Инсайтов пока нет.</p>
      ) : (
        <ul className="divide-y">
          {insights.map((i) => (
            <li key={i.id} className="space-y-1 py-2 text-sm first:pt-0 last:pb-0">
              <Link href={`/insights/${i.id}`} title={i.text} className="hover:underline">
                {insightKeyPhrase(i.text)}
              </Link>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>
                  Задача:{' '}
                  <InlineEditableField
                    value={i.jtbdId ?? ''}
                    type="select"
                    options={jtbdOptions}
                    labels={jtbdLabels}
                    placeholder="+ задача"
                    action={(value) => updateInsightField(i.id, 'jtbdId', value)}
                  />
                </span>
                <span>
                  Гипотеза:{' '}
                  <InlineEditableField
                    value={i.hypothesisId ?? ''}
                    type="select"
                    options={hypothesisOptions}
                    labels={hypothesisLabels}
                    placeholder="+ гипотеза"
                    action={(value) => updateInsightField(i.id, 'hypothesisId', value)}
                  />
                </span>
                {i.hypothesisId && (
                  <span>
                    Сторона:{' '}
                    <InlineEditableField
                      value={i.stance ?? ''}
                      type="select"
                      options={stanceOptions}
                      labels={insightStanceLabels}
                      placeholder="+ сторона"
                      action={(value) => updateInsightField(i.id, 'stance', value)}
                    />
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="space-y-2 rounded-md border p-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Цитата клиента или ключевой вывод"
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Select value={segmentId} onChange={(e) => setSegmentId(e.target.value)}>
            <option value="">Сегмент не указан</option>
            {segments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Select value={jtbdId} onChange={(e) => setJtbdId(e.target.value)}>
            <option value="">JTBD не указан</option>
            {jtbds.map((j) => (
              <option key={j.id} value={j.id} title={j.title}>
                {jtbdKeyPhrase(j.title)}
              </option>
            ))}
          </Select>
        </div>
        <Button type="button" disabled={isPending || !text.trim()} onClick={submit}>
          Добавить инсайт
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
