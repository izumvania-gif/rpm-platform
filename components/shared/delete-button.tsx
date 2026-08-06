'use client'

import { Button } from '@/components/ui/button'

export function DeleteButton({
  action,
  confirmMessage = 'Удалить безвозвратно?',
}: {
  action: () => void
  confirmMessage?: string
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault()
      }}
    >
      <Button type="submit" variant="destructive">
        Удалить
      </Button>
    </form>
  )
}
