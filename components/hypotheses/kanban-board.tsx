'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { HypothesisStatus, type Hypothesis, type Product } from '@prisma/client'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { PinButton } from '@/components/shared/pin-button'
import { toggleHypothesisPinned, updateHypothesisStatus } from '@/lib/actions/hypotheses'
import {
  hypothesisStatusIcon,
  hypothesisStatusLabels,
  hypothesisStatusOrder,
  hypothesisStatusTone,
} from '@/lib/labels'
import { signalToneColors } from '@/lib/signal-colors'
import { cn } from '@/lib/utils'

type HypothesisWithProduct = Hypothesis & { product: Product }

export function HypothesisKanbanBoard({ hypotheses }: { hypotheses: HypothesisWithProduct[] }) {
  const router = useRouter()
  const [items, setItems] = useState(hypotheses)
  const [, startTransition] = useTransition()
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<HypothesisStatus | null>(null)
  const [settledId, setSettledId] = useState<string | null>(null)

  useEffect(() => {
    setItems(hypotheses)
  }, [hypotheses])

  function handleDrop(status: HypothesisStatus) {
    const id = draggingId
    setDraggingId(null)
    setDragOverStatus(null)
    if (!id) return

    const hyp = items.find((h) => h.id === id)
    if (!hyp || hyp.status === status) return

    setItems((prev) => prev.map((h) => (h.id === id ? { ...h, status } : h)))
    setSettledId(id)
    startTransition(async () => {
      await updateHypothesisStatus(id, status)
      router.refresh()
    })
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {hypothesisStatusOrder.map((status) => {
        const columnItems = items.filter((h) => h.status === status)
        const tone = signalToneColors[hypothesisStatusTone[status]]
        return (
          <div
            key={status}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOverStatus(status)
            }}
            onDragLeave={() => setDragOverStatus((prev) => (prev === status ? null : prev))}
            onDrop={(e) => {
              e.preventDefault()
              handleDrop(status)
            }}
            className={cn(
              'min-h-[100px] rounded-lg p-2 transition-colors',
              dragOverStatus === status && 'bg-accent ring-2 ring-primary/40'
            )}
          >
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: tone.border }}
              />
              {hypothesisStatusLabels[status]} ({columnItems.length})
            </h2>
            <div className="space-y-3">
              {columnItems.map((h) => {
                const StatusIcon = hypothesisStatusIcon[h.status]
                return (
                  <div
                    key={h.id}
                    draggable
                    onDragStart={() => setDraggingId(h.id)}
                    onDragEnd={() => {
                      setDraggingId(null)
                      setDragOverStatus(null)
                    }}
                    onClick={() => router.push(`/hypotheses/${h.id}`)}
                    className={cn(
                      'cursor-grab active:cursor-grabbing',
                      draggingId === h.id && 'opacity-40'
                    )}
                  >
                    <Card
                      className={cn(
                        'border-l-4 shadow-sm transition-shadow hover:shadow-md hover:-translate-y-0.5',
                        settledId === h.id && 'motion-safe:animate-card-settle'
                      )}
                      style={{ borderLeftColor: tone.border }}
                      onAnimationEnd={() => setSettledId((prev) => (prev === h.id ? null : prev))}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5" style={{ color: tone.border }}>
                            <StatusIcon size={13} strokeWidth={2} />
                            <span className="font-mono text-[10.5px] uppercase tracking-wide">
                              {h.updatedAt.toLocaleDateString('ru-RU', {
                                day: '2-digit',
                                month: '2-digit',
                              })}
                            </span>
                          </div>
                          <PinButton
                            pinned={h.pinned}
                            action={toggleHypothesisPinned.bind(null, h.id, !h.pinned)}
                          />
                        </div>
                        <CardTitle className="text-sm font-medium line-clamp-3">
                          {h.statement}
                        </CardTitle>
                        <CardDescription>{h.product.name}</CardDescription>
                      </CardHeader>
                    </Card>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
