import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

const STALE_AFTER_MS = 90 * 24 * 60 * 60 * 1000 // 3 месяца — тот же порог, что isStale() в lib/utils.ts
const DRAFT_STUCK_AFTER_MS = 14 * 24 * 60 * 60 * 1000 // гипотезы двигаются быстрее контента

function GapSection({
  title,
  description,
  count,
  children,
}: {
  title: string
  description: string
  count: number
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="border-l-4 border-primary">
        <CardTitle className="text-base font-semibold">
          {title} <span className="font-normal text-muted-foreground">({count})</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        {count === 0 ? (
          <p className="text-sm text-muted-foreground">Пробелов не найдено.</p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

export default async function GapsPage() {
  const userId = getCurrentUserId()
  const now = Date.now()
  const draftCutoff = new Date(now - DRAFT_STUCK_AFTER_MS)

  const [unconfirmedJtbds, segmentsWithoutJtbd, stuckHypotheses, products] = await Promise.all([
    prisma.jTBD.findMany({
      where: { userId, confirmed: false },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.segment.findMany({
      where: { userId, jtbds: { none: {} } },
      include: { product: true },
      orderBy: { name: 'asc' },
    }),
    prisma.hypothesis.findMany({
      where: { userId, status: 'DRAFT', createdAt: { lt: draftCutoff } },
      include: { product: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.product.findMany({
      where: { userId },
      include: { researches: { select: { date: true } } },
      orderBy: { name: 'asc' },
    }),
  ])

  const productsWithoutRecentResearch = products.filter((product) => {
    if (product.researches.length === 0) return true
    const latest = Math.max(...product.researches.map((r) => r.date.getTime()))
    return now - latest > STALE_AFTER_MS
  })

  return (
    <main className="container py-12 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Дашборд пробелов</h1>
        <p className="text-sm text-muted-foreground">
          Автоматически найденные пробелы в уже собранных данных — не ручной чек-лист, а прямой
          запрос по существующим связям.
        </p>
      </div>

      <GapSection
        title="JTBD без подтверждения исследованием"
        description="Задачи, у которых не отмечено «Подтверждено исследованием»."
        count={unconfirmedJtbds.length}
      >
        <ul className="space-y-2">
          {unconfirmedJtbds.map((jtbd) => (
            <li key={jtbd.id} className="text-sm">
              <Link href={`/jtbd/${jtbd.id}`} className="hover:underline">
                {jtbd.title}
              </Link>
              <span className="text-muted-foreground"> — {jtbd.product.name}</span>
            </li>
          ))}
        </ul>
      </GapSection>

      <GapSection
        title="Сегменты без единого JTBD"
        description="У сегмента пока нет ни одной привязанной задачи клиента."
        count={segmentsWithoutJtbd.length}
      >
        <ul className="space-y-2">
          {segmentsWithoutJtbd.map((segment) => (
            <li key={segment.id} className="text-sm">
              <Link href={`/segments/${segment.id}`} className="hover:underline">
                {segment.name}
              </Link>
              <span className="text-muted-foreground"> — {segment.product.name}</span>
            </li>
          ))}
        </ul>
      </GapSection>

      <GapSection
        title="Гипотезы, зависшие в черновике"
        description="В статусе «Черновик» дольше 14 дней без движения по пайплайну."
        count={stuckHypotheses.length}
      >
        <ul className="space-y-2">
          {stuckHypotheses.map((hypothesis) => (
            <li key={hypothesis.id} className="text-sm">
              <Link href={`/hypotheses/${hypothesis.id}`} className="hover:underline">
                {hypothesis.statement}
              </Link>
              <span className="text-muted-foreground"> — {hypothesis.product.name}</span>
            </li>
          ))}
        </ul>
      </GapSection>

      <GapSection
        title="Продукты без исследований за 3 месяца"
        description="Ни одного исследования с датой в последние 90 дней (или их нет вовсе)."
        count={productsWithoutRecentResearch.length}
      >
        <ul className="space-y-2">
          {productsWithoutRecentResearch.map((product) => (
            <li key={product.id} className="text-sm">
              <Link href={`/products/${product.id}`} className="hover:underline">
                {product.name}
              </Link>
            </li>
          ))}
        </ul>
      </GapSection>
    </main>
  )
}
