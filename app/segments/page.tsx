import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default async function SegmentsPage() {
  const segments = await prisma.segment.findMany({
    where: { userId: getCurrentUserId() },
    orderBy: { createdAt: 'desc' },
    include: { product: true },
  })

  return (
    <main className="container py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Сегменты</h1>
        <Link href="/segments/new" className={buttonVariants()}>
          Новый сегмент
        </Link>
      </div>

      {segments.length === 0 ? (
        <p className="text-muted-foreground">Сегментов пока нет.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {segments.map((segment) => (
            <Link key={segment.id} href={`/segments/${segment.id}`}>
              <Card className="h-full hover:border-primary transition-colors">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: segment.color }}
                    />
                    <CardTitle>{segment.name}</CardTitle>
                  </div>
                  <CardDescription>{segment.product.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  {segment.audienceShare != null && (
                    <p className="text-sm text-muted-foreground">
                      {segment.audienceShare}% аудитории
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
