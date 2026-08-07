import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { RecentlyViewedWidget } from '@/components/shared/recently-viewed-widget'
import { SectionHeading } from '@/components/shared/section-heading'
import {
  productModule,
  researchGroupMeta,
  researchModules,
  positioningGroupMeta,
  positioningModules,
  type ModuleMeta,
} from '@/lib/module-meta'
import { signalToneColors, type SignalTone } from '@/lib/signal-colors'

export const dynamic = 'force-dynamic'

function ModuleTile({
  module,
  count,
  tone,
}: {
  module: ModuleMeta
  count: number
  tone?: SignalTone
}) {
  return (
    <Link href={module.href}>
      <Card
        className="h-full border-t-4 shadow-sm transition-shadow hover:shadow-md"
        style={{ borderTopColor: tone ? signalToneColors[tone].border : 'hsl(var(--primary))' }}
      >
        <CardHeader>
          <CardTitle>{module.label}</CardTitle>
          <CardDescription>{module.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <span className="font-mono text-3xl font-bold">{count}</span>
        </CardContent>
      </Card>
    </Link>
  )
}

interface FeedItem {
  href: string
  title: string
  kind: string
  updatedAt: Date
  createdAt?: Date
}

export default async function Home() {
  const userId = getCurrentUserId()
  const [
    productCount,
    researchCount,
    segmentCount,
    jtbdCount,
    hypothesisCount,
    conversationCount,
    competitorCount,
    featureCount,
    rtbCount,
    insightCount,
    pinnedResearch,
    pinnedSegments,
    pinnedJtbds,
    pinnedHypotheses,
    pinnedConversations,
    pinnedCompetitors,
    pinnedFeatures,
    pinnedRTBs,
    pinnedInsights,
    recentProducts,
    recentResearch,
    recentSegments,
    recentJtbds,
    recentHypotheses,
    recentConversations,
    recentCompetitors,
    recentFeatures,
    recentRTBs,
    recentInsights,
  ] = await Promise.all([
    prisma.product.count({ where: { userId } }),
    prisma.research.count({ where: { userId } }),
    prisma.segment.count({ where: { userId } }),
    prisma.jTBD.count({ where: { userId } }),
    prisma.hypothesis.count({ where: { userId } }),
    prisma.conversation.count({ where: { userId } }),
    prisma.competitor.count({ where: { userId } }),
    prisma.feature.count({ where: { userId } }),
    prisma.rTB.count({ where: { userId } }),
    prisma.insight.count({ where: { userId } }),
    prisma.research.findMany({ where: { userId, pinned: true }, orderBy: { updatedAt: 'desc' } }),
    prisma.segment.findMany({ where: { userId, pinned: true }, orderBy: { updatedAt: 'desc' } }),
    prisma.jTBD.findMany({ where: { userId, pinned: true }, orderBy: { updatedAt: 'desc' } }),
    prisma.hypothesis.findMany({ where: { userId, pinned: true }, orderBy: { updatedAt: 'desc' } }),
    prisma.conversation.findMany({
      where: { userId, pinned: true },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.competitor.findMany({
      where: { userId, pinned: true },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.feature.findMany({ where: { userId, pinned: true }, orderBy: { updatedAt: 'desc' } }),
    prisma.rTB.findMany({ where: { userId, pinned: true }, orderBy: { updatedAt: 'desc' } }),
    prisma.insight.findMany({ where: { userId, pinned: true }, orderBy: { updatedAt: 'desc' } }),
    prisma.product.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, take: 15 }),
    prisma.research.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, take: 15 }),
    prisma.segment.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, take: 15 }),
    prisma.jTBD.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, take: 15 }),
    prisma.hypothesis.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, take: 15 }),
    prisma.conversation.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, take: 15 }),
    prisma.competitor.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, take: 15 }),
    prisma.feature.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, take: 15 }),
    prisma.rTB.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, take: 15 }),
    prisma.insight.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, take: 15 }),
  ])

  const pinnedItems: FeedItem[] = [
    ...pinnedResearch.map((r) => ({
      href: `/research/${r.id}`,
      title: `#${r.number} ${r.title}`,
      kind: 'Исследование',
      updatedAt: r.updatedAt,
    })),
    ...pinnedSegments.map((s) => ({
      href: `/segments/${s.id}`,
      title: s.name,
      kind: 'Сегмент',
      updatedAt: s.updatedAt,
    })),
    ...pinnedJtbds.map((j) => ({
      href: `/jtbd/${j.id}`,
      title: j.title,
      kind: 'JTBD',
      updatedAt: j.updatedAt,
    })),
    ...pinnedHypotheses.map((h) => ({
      href: `/hypotheses/${h.id}`,
      title: h.statement,
      kind: 'Гипотеза',
      updatedAt: h.updatedAt,
    })),
    ...pinnedConversations.map((c) => ({
      href: `/conversations/${c.id}`,
      title: c.title,
      kind: 'Разговор',
      updatedAt: c.updatedAt,
    })),
    ...pinnedCompetitors.map((c) => ({
      href: `/competitors/${c.id}`,
      title: c.name,
      kind: 'Конкурент',
      updatedAt: c.updatedAt,
    })),
    ...pinnedFeatures.map((f) => ({
      href: `/features/${f.id}`,
      title: f.name,
      kind: 'Фича',
      updatedAt: f.updatedAt,
    })),
    ...pinnedRTBs.map((r) => ({
      href: `/marketing/${r.id}`,
      title: r.statement,
      kind: 'RTB',
      updatedAt: r.updatedAt,
    })),
    ...pinnedInsights.map((i) => ({
      href: `/insights/${i.id}`,
      title: i.text,
      kind: 'Инсайт',
      updatedAt: i.updatedAt,
    })),
  ].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())

  const activityItems: FeedItem[] = [
    ...recentProducts.map((p) => ({
      href: `/products/${p.id}`,
      title: p.name,
      kind: 'Продукт',
      updatedAt: p.updatedAt,
      createdAt: p.createdAt,
    })),
    ...recentResearch.map((r) => ({
      href: `/research/${r.id}`,
      title: `#${r.number} ${r.title}`,
      kind: 'Исследование',
      updatedAt: r.updatedAt,
      createdAt: r.createdAt,
    })),
    ...recentSegments.map((s) => ({
      href: `/segments/${s.id}`,
      title: s.name,
      kind: 'Сегмент',
      updatedAt: s.updatedAt,
      createdAt: s.createdAt,
    })),
    ...recentJtbds.map((j) => ({
      href: `/jtbd/${j.id}`,
      title: j.title,
      kind: 'JTBD',
      updatedAt: j.updatedAt,
      createdAt: j.createdAt,
    })),
    ...recentHypotheses.map((h) => ({
      href: `/hypotheses/${h.id}`,
      title: h.statement,
      kind: 'Гипотеза',
      updatedAt: h.updatedAt,
      createdAt: h.createdAt,
    })),
    ...recentConversations.map((c) => ({
      href: `/conversations/${c.id}`,
      title: c.title,
      kind: 'Разговор',
      updatedAt: c.updatedAt,
      createdAt: c.createdAt,
    })),
    ...recentCompetitors.map((c) => ({
      href: `/competitors/${c.id}`,
      title: c.name,
      kind: 'Конкурент',
      updatedAt: c.updatedAt,
      createdAt: c.createdAt,
    })),
    ...recentFeatures.map((f) => ({
      href: `/features/${f.id}`,
      title: f.name,
      kind: 'Фича',
      updatedAt: f.updatedAt,
      createdAt: f.createdAt,
    })),
    ...recentRTBs.map((r) => ({
      href: `/marketing/${r.id}`,
      title: r.statement,
      kind: 'RTB',
      updatedAt: r.updatedAt,
      createdAt: r.createdAt,
    })),
    ...recentInsights.map((i) => ({
      href: `/insights/${i.id}`,
      title: i.text,
      kind: 'Инсайт',
      updatedAt: i.updatedAt,
      createdAt: i.createdAt,
    })),
  ]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 15)

  const counts: Record<string, number> = {
    '/products': productCount,
    '/research': researchCount,
    '/segments': segmentCount,
    '/jtbd': jtbdCount,
    '/hypotheses': hypothesisCount,
    '/conversations': conversationCount,
    '/competitors': competitorCount,
    '/features': featureCount,
    '/marketing': rtbCount,
    '/insights': insightCount,
  }

  return (
    <main className="container py-12">
      <h1 className="text-3xl font-bold mb-2">RPM Platform</h1>
      <p className="text-muted-foreground mb-8">
        Платформа для управления продуктовыми исследованиями и сегментами клиентов
      </p>

      <div className="mb-8 max-w-xs">
        <ModuleTile module={productModule} count={counts[productModule.href]} />
      </div>

      <div className="mb-8 space-y-4">
        <SectionHeading title={researchGroupMeta.title} description={researchGroupMeta.description} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {researchModules.map((module) => (
            <ModuleTile
              key={module.href}
              module={module}
              count={counts[module.href]}
              tone={researchGroupMeta.tone}
            />
          ))}
        </div>
      </div>

      <div className="mb-10 space-y-4">
        <SectionHeading
          title={positioningGroupMeta.title}
          description={positioningGroupMeta.description}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {positioningModules.map((module) => (
            <ModuleTile
              key={module.href}
              module={module}
              count={counts[module.href]}
              tone={positioningGroupMeta.tone}
            />
          ))}
        </div>
      </div>

      <div className="mb-10">
        <Link href="/reports" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Отчёты: матрица Сегменты × JTBD, пробелы →
        </Link>
      </div>

      <RecentlyViewedWidget />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {pinnedItems.length > 0 && (
          <Card>
            <CardHeader className="border-l-4 border-primary">
              <CardTitle className="text-base">Закреплённое</CardTitle>
              <CardDescription>Важные записи, отмеченные звёздочкой</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-wrap gap-2">
                {pinnedItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="inline-block rounded-md border px-3 py-1.5 text-sm hover:border-primary"
                    >
                      <span className="text-muted-foreground">{item.kind}:</span> {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {activityItems.length > 0 && (
          <Card>
            <CardHeader className="border-l-4 border-primary">
              <CardTitle className="text-base">Последняя активность</CardTitle>
              <CardDescription>Что изменилось в последних записях</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {activityItems.map((item) => (
                  <li key={item.href} className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="shrink-0">
                      {item.kind}
                    </Badge>
                    <Link href={item.href} className="min-w-0 flex-1 truncate hover:underline">
                      {item.title}
                    </Link>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {item.createdAt && item.createdAt.getTime() === item.updatedAt.getTime()
                        ? 'создано'
                        : 'обновлено'}{' '}
                      {item.updatedAt.toLocaleString('ru-RU')}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
