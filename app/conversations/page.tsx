import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

export default async function ConversationsPage() {
  const conversations = await prisma.conversation.findMany({
    where: { userId: getCurrentUserId() },
    orderBy: { date: 'desc' },
    include: { product: true },
  })

  return (
    <main className="container py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Разговоры</h1>
        <Link href="/conversations/new" className={buttonVariants()}>
          Новый разговор
        </Link>
      </div>

      {conversations.length === 0 ? (
        <p className="text-muted-foreground">Разговоров пока нет.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4">Название</th>
                <th className="py-2 pr-4">Продукт</th>
                <th className="py-2 pr-4">Теги</th>
                <th className="py-2 pr-4">Дата</th>
              </tr>
            </thead>
            <tbody>
              {conversations.map((c) => (
                <tr key={c.id} className="border-b hover:bg-accent/50">
                  <td className="py-2 pr-4">
                    <Link href={`/conversations/${c.id}`} className="hover:underline">
                      {c.title}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">{c.product.name}</td>
                  <td className="py-2 pr-4">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="py-2 pr-4">{c.date.toLocaleDateString('ru-RU')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
