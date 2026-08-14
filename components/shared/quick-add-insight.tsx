'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import type { Insight, JTBD, Segment } from '@prisma/client'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { createInsightQuick } from '@/lib/actions/insights'
import { insightKeyPhrase, jtbdKeyPhrase } from '@/lib/key-phrase'

export function QuickAddInsight({
  productId,
  researchId,
  conversationId,
  segments,
  jtbds,
  initialInsights,
}: {
  productId: string
  researchId?: string
  conversationId?: string
  segments: Segment[]
  jtbds: JTBD[]
  initialInsights: Insight[]
}) {
  const [insights, setInsights] = useState(initialInsights)
  const [text, setText] = useState('')
  const [segmentId, setSegmentId] = useState('')
  const [jtbdId, setJtbdId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

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
      setInsights((prev) => [...prev, result.insight])
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
        <ul className="space-y-2">
          {insights.map((i) => (
            <li key={i.id} className="text-sm">
              <Link href={`/insights/${i.id}`} title={i.text} className="hover:underline">
                {insightKeyPhrase(i.text)}
              </Link>
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
