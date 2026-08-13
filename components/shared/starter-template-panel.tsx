'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { applyStarterTemplate } from '@/lib/actions/templates'
import type { TemplateSummary } from '@/lib/starter-templates'

// Starter templates (plans/2.0-product-leap-plan.md, A4).
//
// Templates are passed in as props rather than imported here: lib/starter-
// templates.ts pulls JtbdJobType from @prisma/client, and importing that into
// a client component drags server-only code across the boundary. The page
// (a Server Component) already has it.
export function StarterTemplatePanel({
  productId,
  templates,
}: {
  productId: string
  templates: TemplateSummary[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function apply(key: string) {
    setSelected(key)
    startTransition(async () => {
      const response = await applyStarterTemplate(productId, key)
      if (!response.ok) {
        setError(response.error)
        return
      }
      setError(null)
      setResult(
        `Добавлено: сегментов ${response.segments}, JTBD ${response.jtbds}, гипотез ${response.hypotheses}`
      )
      router.refresh()
    })
  }

  if (!open) {
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        Взять заготовку
      </Button>
    )
  }

  return (
    <div className="w-full space-y-3 rounded-md border bg-background p-3 shadow-sm">
      <p className="text-sm text-muted-foreground">
        Готовый скелет: сегменты, JTBD и гипотезы, уже связанные между собой. Всё приходит
        неподтверждённым — лишнее удалите, своё переименуйте.
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {templates.map((template) => (
          <div
            key={template.key}
            className={cn(
              'flex flex-col gap-2 rounded-md border p-3',
              selected === template.key && isPending && 'opacity-60'
            )}
          >
            <div className="space-y-1">
              <p className="text-sm font-medium">{template.name}</p>
              <p className="text-xs text-muted-foreground">{template.description}</p>
              <p className="text-xs text-muted-foreground">
                {template.segmentCount} сегм. · {template.jtbdCount} JTBD ·{' '}
                {template.hypothesisCount} гип.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => apply(template.key)}
              className="mt-auto"
            >
              Применить
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
          Закрыть
        </Button>
        {result && (
          <span role="status" className="text-xs text-muted-foreground">
            {result}
          </span>
        )}
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    </div>
  )
}
