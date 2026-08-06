import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { statusLabels, typeLabels } from '@/lib/labels'

export const dynamic = 'force-dynamic'

export default async function ResearchPage() {
  const researches = await prisma.research.findMany({
    where: { userId: getCurrentUserId() },
    orderBy: { date: 'desc' },
    include: { product: true },
  })

  return (
    <main className="container py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Исследования</h1>
        <Link href="/research/new" className={buttonVariants()}>
          Новое исследование
        </Link>
      </div>

      {researches.length === 0 ? (
        <p className="text-muted-foreground">Исследований пока нет.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4">#</th>
                <th className="py-2 pr-4">Название</th>
                <th className="py-2 pr-4">Продукт</th>
                <th className="py-2 pr-4">Тип</th>
                <th className="py-2 pr-4">Статус</th>
                <th className="py-2 pr-4">Дата</th>
              </tr>
            </thead>
            <tbody>
              {researches.map((r) => (
                <tr key={r.id} className="border-b hover:bg-accent/50">
                  <td className="py-2 pr-4">
                    <Link href={`/research/${r.id}`} className="hover:underline">
                      {r.number}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">
                    <Link href={`/research/${r.id}`} className="hover:underline">
                      {r.title}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">{r.product.name}</td>
                  <td className="py-2 pr-4">{typeLabels[r.type]}</td>
                  <td className="py-2 pr-4">
                    <Badge variant={r.status === 'COMPLETED' ? 'default' : 'secondary'}>
                      {statusLabels[r.status]}
                    </Badge>
                  </td>
                  <td className="py-2 pr-4">{r.date.toLocaleDateString('ru-RU')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
