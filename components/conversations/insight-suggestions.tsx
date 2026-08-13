'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createInsightQuick } from '@/lib/actions/insights'
import { suggestInsightsFromTranscript } from '@/lib/suggestions'

// Derived insight suggestions on a conversation (C4). The transcript already
// contains the quotes worth keeping; this stops asking the PM to re-type them.
//
// Accepting is one click and writes through the existing createInsightQuick,
// so a suggestion never becomes a second way to create a record — the same
// draft-then-confirm rule the AI plan sets out for B2.
export function InsightSuggestions({
  productId,
  conversationId,
  segmentId,
  transcript,
  existingInsightTexts,
}: {
  productId: string
  conversationId: string
  segmentId: string | null
  transcript: string | null
  existingInsightTexts: string[]
}) {
  const router = useRouter()
  const [dismissed, setDismissed] = useState<string[]>([])
  const [accepted, setAccepted] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const suggestions = useMemo(
    () => suggestInsightsFromTranscript(transcript, [...existingInsightTexts, ...accepted]),
    [transcript, existingInsightTexts, accepted]
  )
  const visible = suggestions.filter((s) => !dismissed.includes(s.text))

  if (visible.length === 0) return null

  return (
    <div className="rounded-md border border-dashed p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Похоже на инсайты
        </p>
        <span className="text-xs text-muted-foreground">
          Найдено в транскрипте — ничего не сохраняется, пока не нажата кнопка
        </span>
      </div>

      {error && <p className="mb-2 text-sm text-destructive">{error}</p>}

      <ul className="divide-y">
        {visible.map((suggestion) => (
          <li
            key={suggestion.text}
            className="flex flex-wrap items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
          >
            <div className="min-w-0">
              <p className="text-sm">{suggestion.text}</p>
              <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await createInsightQuick(
                      productId,
                      suggestion.text,
                      segmentId,
                      null,
                      null,
                      conversationId
                    )
                    if (!result.ok) {
                      setError(result.error)
                      return
                    }
                    setError(null)
                    // Tracked locally as well as via refresh so the row leaves
                    // immediately rather than after the server round trip.
                    setAccepted((prev) => [...prev, suggestion.text])
                    router.refresh()
                  })
                }
              >
                В инсайты
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setDismissed((prev) => [...prev, suggestion.text])}
              >
                Скрыть
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
