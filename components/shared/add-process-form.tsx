'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createProcessQuick } from '@/lib/actions/processes'

// Inline "Добавить процесс" (plans/2.0-ux-improvement-plan.md, Фаза 5) —
// same toggle-button-then-form shape as the other two inline /pm forms. No
// "Больше полей →" escape hatch here — the full form (ProcessForm) only
// ever has this one field too, so there's nothing extra to reach.
export function AddProcessForm({ productId }: { productId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function reset() {
    setOpen(false)
    setTitle('')
    setError(null)
  }

  function submit() {
    startTransition(async () => {
      const result = await createProcessQuick(productId, title)
      if (!result.ok) {
        setError(result.error)
        return
      }
      reset()
      // Unlike the roadmap/action-plan lists, a process has a second level
      // (its canvas) — select the one just created instead of leaving the
      // user on the list they were just looking at. `scroll: false` keeps this
      // from resetting the page back to the top the way a plain router.push
      // would. Прежний `scrollTo=process` тут больше не нужен: с фазы 9
      // процессы это отдельный маршрут, а не секция в середине длинной
      // страницы, и возвращать скролл не к чему.
      router.push(`/pm/processes?productId=${productId}&processId=${result.process.id}`, {
        scroll: false,
      })
    })
  }

  if (!open) {
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        Добавить процесс
      </Button>
    )
  }

  return (
    <div className="w-full max-w-sm space-y-2 rounded-md border bg-background p-3 shadow-sm">
      <Input
        autoFocus
        placeholder="Например: Запуск маркетинговой кампании"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={isPending || !title.trim()} onClick={submit}>
          Добавить
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={reset}>
          Отмена
        </Button>
      </div>
    </div>
  )
}
