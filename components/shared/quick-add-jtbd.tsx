'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import type { JTBD } from '@prisma/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { JobTypeBadge } from '@/components/shared/job-type-badge'
import { createJtbdQuick } from '@/lib/actions/jtbd-graph'
import { jtbdKeyPhrase } from '@/lib/key-phrase'

// Adding a job from the segment whose job it is.
//
// A segment page showed nothing about its JTBD at all, so "this segment also
// needs X" meant going to /jtbd/new and picking the segment back out of a
// list — and the segment is the root of the discovery chain, the place where
// that thought actually occurs.
//
// Not the quick-capture modal: that one knows a product, not a segment, and a
// job created here that wasn't attached to this segment would be exactly the
// unattached record /reports/gaps exists to complain about.
export function QuickAddJtbd({
  productId,
  segmentId,
  initialJtbds,
}: {
  productId: string
  /** Every job created here is attached to it — that is the whole point. */
  segmentId: string
  initialJtbds: JTBD[]
}) {
  const [jtbds, setJtbds] = useState(initialJtbds)
  const [title, setTitle] = useState('')
  // Required by the model and feeding the coverage and gaps reports, so it is
  // asked here too rather than defaulted, same as every other path that
  // creates a JTBD outside its own form.
  const [category, setCategory] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const canSubmit = title.trim() !== '' && category.trim() !== ''

  function submit() {
    if (!canSubmit) return
    startTransition(async () => {
      const result = await createJtbdQuick(productId, title, category, 'SMALL_JOB', [segmentId])
      if (!result.ok) {
        setError(result.error)
        return
      }
      setJtbds((prev) => [...prev, result.jtbd])
      setTitle('')
      setCategory('')
      setError(null)
    })
  }

  return (
    <div className="space-y-3">
      {jtbds.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          У сегмента пока нет задач. Без них он не попадёт ни в матрицу покрытия, ни в «Маркетинг».
        </p>
      ) : (
        <ul className="divide-y text-sm">
          {jtbds.map((jtbd) => (
            <li key={jtbd.id} className="flex items-baseline justify-between gap-3 py-1.5">
              {/* Key phrase, full text in the title — the same rule as every
                  other place a templated record is scanned rather than read. */}
              <Link
                href={`/jtbd/${jtbd.id}`}
                title={jtbd.title}
                className="min-w-0 flex-1 truncate hover:underline"
              >
                {jtbdKeyPhrase(jtbd.title)}
              </Link>
              <span className="shrink-0 text-xs text-muted-foreground">{jtbd.category}</span>
              <JobTypeBadge jobType={jtbd.jobType} />
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2 rounded-md border p-3">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Когда ..., я хочу ..., чтобы ..."
          aria-label="Формулировка JTBD"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Категория"
            aria-label="Категория JTBD"
            className="w-48"
          />
          <Button type="button" disabled={isPending || !canSubmit} onClick={submit}>
            Добавить JTBD
          </Button>
          <span className="text-xs text-muted-foreground">
            масштаб задачи и остальные поля — на её карточке
          </span>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
