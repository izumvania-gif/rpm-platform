'use client'

import { SubmitButton } from '@/components/shared/submit-button'

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
      <SubmitButton variant="destructive" pendingText="Удаление...">
        Удалить
      </SubmitButton>
    </form>
  )
}
