'use client'

import { useState, useTransition } from 'react'
import { ResearchType, type JTBD, type Segment } from '@prisma/client'
import type { Research, Conversation, Insight } from '@prisma/client'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { createResearchQuick } from '@/lib/actions/research'
import { createConversationQuick } from '@/lib/actions/conversations'
import { createInsightQuick } from '@/lib/actions/insights'
import { typeLabels } from '@/lib/labels'
import { WizardEntryList } from './wizard-entry-list'

type ConversationWithRelations = Conversation & { segment: Segment | null; research: Research | null }
type InsightWithRelations = Insight & {
  segment: Segment | null
  jtbd: JTBD | null
  research: Research | null
  conversation: Conversation | null
}

export function ResearchStepForm({
  productId,
  segments,
  jtbds,
  initialResearch,
  initialConversations,
  initialInsights,
}: {
  productId: string
  segments: Segment[]
  jtbds: JTBD[]
  initialResearch: Research[]
  initialConversations: ConversationWithRelations[]
  initialInsights: InsightWithRelations[]
}) {
  const [research, setResearch] = useState(initialResearch)
  const [conversations, setConversations] = useState(initialConversations)
  const [insights, setInsights] = useState(initialInsights)

  const [researchTitle, setResearchTitle] = useState('')
  const [researchType, setResearchType] = useState<ResearchType>(ResearchType.QUALITATIVE)
  const [researchError, setResearchError] = useState<string | null>(null)
  const [isResearchPending, startResearchTransition] = useTransition()

  const [conversationTitle, setConversationTitle] = useState('')
  const [conversationSegmentId, setConversationSegmentId] = useState('')
  const [conversationResearchId, setConversationResearchId] = useState('')
  const [conversationError, setConversationError] = useState<string | null>(null)
  const [isConversationPending, startConversationTransition] = useTransition()

  const [insightText, setInsightText] = useState('')
  const [insightSegmentId, setInsightSegmentId] = useState('')
  const [insightJtbdId, setInsightJtbdId] = useState('')
  const [insightResearchId, setInsightResearchId] = useState('')
  const [insightConversationId, setInsightConversationId] = useState('')
  const [insightError, setInsightError] = useState<string | null>(null)
  const [isInsightPending, startInsightTransition] = useTransition()

  function submitResearch() {
    if (!researchTitle.trim()) return
    startResearchTransition(async () => {
      const result = await createResearchQuick(productId, researchTitle, researchType)
      if (!result.ok) {
        setResearchError(result.error)
        return
      }
      setResearch((prev) => [...prev, result.research])
      setResearchTitle('')
      setResearchError(null)
    })
  }

  function submitConversation() {
    if (!conversationTitle.trim()) return
    startConversationTransition(async () => {
      const result = await createConversationQuick(
        productId,
        conversationTitle,
        conversationSegmentId || null,
        conversationResearchId || null
      )
      if (!result.ok) {
        setConversationError(result.error)
        return
      }
      const segment = segments.find((s) => s.id === conversationSegmentId) ?? null
      const researchItem = research.find((r) => r.id === conversationResearchId) ?? null
      setConversations((prev) => [...prev, { ...result.conversation, segment, research: researchItem }])
      setConversationTitle('')
      setConversationError(null)
    })
  }

  function submitInsight() {
    if (!insightText.trim()) return
    startInsightTransition(async () => {
      const result = await createInsightQuick(
        productId,
        insightText,
        insightSegmentId || null,
        insightJtbdId || null,
        insightResearchId || null,
        insightConversationId || null
      )
      if (!result.ok) {
        setInsightError(result.error)
        return
      }
      const segment = segments.find((s) => s.id === insightSegmentId) ?? null
      const jtbd = jtbds.find((j) => j.id === insightJtbdId) ?? null
      const researchItem = research.find((r) => r.id === insightResearchId) ?? null
      const conversation = conversations.find((c) => c.id === insightConversationId) ?? null
      setInsights((prev) => [
        ...prev,
        { ...result.insight, segment, jtbd, research: researchItem, conversation },
      ])
      setInsightText('')
      setInsightError(null)
    })
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Исследования</h2>
        <div className="space-y-2 rounded-md border p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Input
              className="sm:col-span-2"
              value={researchTitle}
              onChange={(e) => setResearchTitle(e.target.value)}
              placeholder="Например: Интервью с сегментом «Банки топ-30»"
            />
            <Select
              value={researchType}
              onChange={(e) => setResearchType(e.target.value as ResearchType)}
            >
              {Object.values(ResearchType).map((type) => (
                <option key={type} value={type}>
                  {typeLabels[type]}
                </option>
              ))}
            </Select>
          </div>
          <Button
            type="button"
            disabled={isResearchPending || !researchTitle.trim()}
            onClick={submitResearch}
          >
            Добавить
          </Button>
        </div>
        {researchError && <p className="text-sm text-destructive">{researchError}</p>}
        <WizardEntryList
          items={research.map((r) => ({ id: r.id, label: r.title, meta: typeLabels[r.type] }))}
          emptyLabel="Исследований пока нет."
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Разговоры</h2>
        <div className="space-y-2 rounded-md border p-3">
          <Input
            value={conversationTitle}
            onChange={(e) => setConversationTitle(e.target.value)}
            placeholder="Например: Звонок с product owner"
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Select
              value={conversationSegmentId}
              onChange={(e) => setConversationSegmentId(e.target.value)}
            >
              <option value="">Сегмент не указан</option>
              {segments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Select
              value={conversationResearchId}
              onChange={(e) => setConversationResearchId(e.target.value)}
            >
              <option value="">Исследование не указано</option>
              {research.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </Select>
          </div>
          <Button
            type="button"
            disabled={isConversationPending || !conversationTitle.trim()}
            onClick={submitConversation}
          >
            Добавить
          </Button>
        </div>
        {conversationError && <p className="text-sm text-destructive">{conversationError}</p>}
        <WizardEntryList
          items={conversations.map((c) => ({
            id: c.id,
            label: c.title,
            meta: [c.segment?.name, c.research?.title].filter(Boolean).join(' · '),
          }))}
          emptyLabel="Разговоров пока нет."
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Инсайты</h2>
        <div className="space-y-2 rounded-md border p-3">
          <Textarea
            value={insightText}
            onChange={(e) => setInsightText(e.target.value)}
            placeholder="Цитата клиента или ключевой вывод"
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Select value={insightSegmentId} onChange={(e) => setInsightSegmentId(e.target.value)}>
              <option value="">Сегмент не указан</option>
              {segments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Select value={insightJtbdId} onChange={(e) => setInsightJtbdId(e.target.value)}>
              <option value="">JTBD не указан</option>
              {jtbds.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </Select>
            <Select value={insightResearchId} onChange={(e) => setInsightResearchId(e.target.value)}>
              <option value="">Исследование не указано</option>
              {research.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </Select>
            <Select
              value={insightConversationId}
              onChange={(e) => setInsightConversationId(e.target.value)}
            >
              <option value="">Разговор не указан</option>
              {conversations.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </Select>
          </div>
          <Button
            type="button"
            disabled={isInsightPending || !insightText.trim()}
            onClick={submitInsight}
          >
            Добавить
          </Button>
        </div>
        {insightError && <p className="text-sm text-destructive">{insightError}</p>}
        <WizardEntryList
          items={insights.map((i) => ({
            id: i.id,
            label: i.text,
            meta: [i.segment?.name, i.jtbd?.title].filter(Boolean).join(' · '),
          }))}
          emptyLabel="Инсайтов пока нет."
        />
      </section>
    </div>
  )
}
