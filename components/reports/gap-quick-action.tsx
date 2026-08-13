'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { moveStuckHypothesisToReview } from '@/lib/actions/gaps'

// One-click resolution from the gaps queue (C3). Stays on the page and lets
// the row disappear on refresh — the point of a queue is that pressing the
// button shortens the queue, without a round trip through a detail page.
export function GapQuickAction({ hypothesisId, label }: { hypothesisId: string; label: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <span className="flex items-center gap-2">
      {error && <span className="text-xs text-destructive">{error}</span>}
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null)
            const result = await moveStuckHypothesisToReview(hypothesisId)
            if (!result.ok) {
              setError(result.error)
              return
            }
            router.refresh()
          })
        }
      >
        {label}
      </Button>
    </span>
  )
}
