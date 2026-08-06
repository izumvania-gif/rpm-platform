import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="container py-24 text-center">
      <h1 className="text-3xl font-bold mb-2">Страница не найдена</h1>
      <p className="text-muted-foreground mb-8">
        Запись могла быть удалена или адрес введён неверно.
      </p>
      <Link href="/" className={buttonVariants()}>
        На главную
      </Link>
    </main>
  )
}
