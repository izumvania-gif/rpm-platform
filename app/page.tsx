import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const userId = getCurrentUserId()
  const [productCount, researchCount, segmentCount] = await Promise.all([
    prisma.product.count({ where: { userId } }),
    prisma.research.count({ where: { userId } }),
    prisma.segment.count({ where: { userId } }),
  ])

  const cards = [
    {
      href: '/products',
      label: 'Продукты',
      count: productCount,
      description: 'Профили продуктов и их стадии',
    },
    {
      href: '/research',
      label: 'Исследования',
      count: researchCount,
      description: 'Репозиторий клиентских исследований',
    },
    {
      href: '/segments',
      label: 'Сегменты',
      count: segmentCount,
      description: 'Сегменты клиентов по продуктам',
    },
  ]

  return (
    <main className="container py-12">
      <h1 className="text-3xl font-bold mb-2">ECHO Platform</h1>
      <p className="text-muted-foreground mb-8">
        Платформа для управления продуктовыми исследованиями и сегментами клиентов
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.href} href={card.href}>
            <Card className="h-full hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle>{card.label}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-3xl font-bold">{card.count}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  )
}
