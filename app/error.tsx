'use client'

import { Button } from '@/components/ui/button'

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="container py-24 text-center">
      <h1 className="text-3xl font-bold mb-2">Что-то пошло не так</h1>
      <p className="text-muted-foreground mb-8">
        Произошла непредвиденная ошибка. Попробуйте ещё раз.
      </p>
      <Button onClick={() => reset()}>Повторить</Button>
    </main>
  )
}
