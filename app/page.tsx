import Link from 'next/link'
import { ArrowUpRight, Star } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { RecentlyViewedWidget } from '@/components/shared/recently-viewed-widget'
import { DashboardWidgetGrid } from '@/components/shared/dashboard-widget-grid'
import { DashboardGapsSummary } from '@/components/shared/dashboard-gaps-summary'
import { DashboardJtbdCoverage } from '@/components/shared/dashboard-jtbd-coverage'
import { DashboardDiscoveryChain } from '@/components/shared/dashboard-discovery-chain'
import { hypothesisKeyPhrase, insightKeyPhrase, jtbdKeyPhrase } from '@/lib/key-phrase'
import { DashboardHypothesisFunnel } from '@/components/shared/dashboard-hypothesis-funnel'
import { DashboardResearchCadence } from '@/components/shared/dashboard-research-cadence'
import { productModule, moduleByHref } from '@/lib/module-meta'
import { stageLabels } from '@/lib/labels'
import { ModuleRail } from '@/components/shared/module-rail'
import { getNavStage } from '@/lib/nav-stage'
import { isBaseModule } from '@/lib/nav-disclosure'
import {
  getGapsCounts,
  getHypothesisStatusCounts,
  getDiscoveryChain,
  getJtbdCoverage,
  getResearchCadence,
} from '@/lib/dashboard-metrics'

export const dynamic = 'force-dynamic'

interface FeedItem {
  href: string
  title: string
  /** Untouched original when `title` is a key phrase; used for the tooltip. */
  fullTitle?: string
  kind: string
  moduleHref: string
  updatedAt: Date
  createdAt?: Date
}

export default async function Home() {
  const userId = getCurrentUserId()

  const dashboardMetrics = Promise.all([
    getGapsCounts(userId),
    getJtbdCoverage(userId),
    getDiscoveryChain(userId),
    getHypothesisStatusCounts(userId),
    getResearchCadence(userId),
  ])

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

  const [gapsCounts, jtbdCoverage, discoveryChain, hypothesisStatusCounts, researchCadence] =
    await dashboardMetrics

  const pinnedItems: FeedItem[] = [
    ...pinnedResearch.map((r) => ({
      href: `/research/${r.id}`,
      title: `#${r.number} ${r.title}`,
      kind: 'Исследование',
      moduleHref: '/research',
      updatedAt: r.updatedAt,
    })),
    ...pinnedSegments.map((s) => ({
      href: `/segments/${s.id}`,
      title: s.name,
      kind: 'Сегмент',
      moduleHref: '/segments',
      updatedAt: s.updatedAt,
    })),
    ...pinnedJtbds.map((j) => ({
      href: `/jtbd/${j.id}`,
      title: jtbdKeyPhrase(j.title),
      fullTitle: j.title,
      kind: 'JTBD',
      moduleHref: '/jtbd',
      updatedAt: j.updatedAt,
    })),
    ...pinnedHypotheses.map((h) => ({
      href: `/hypotheses/${h.id}`,
      title: hypothesisKeyPhrase(h.statement),
      fullTitle: h.statement,
      kind: 'Гипотеза',
      moduleHref: '/hypotheses',
      updatedAt: h.updatedAt,
    })),
    ...pinnedConversations.map((c) => ({
      href: `/conversations/${c.id}`,
      title: c.title,
      kind: 'Разговор',
      moduleHref: '/conversations',
      updatedAt: c.updatedAt,
    })),
    ...pinnedCompetitors.map((c) => ({
      href: `/competitors/${c.id}`,
      title: c.name,
      kind: 'Конкурент',
      moduleHref: '/competitors',
      updatedAt: c.updatedAt,
    })),
    ...pinnedFeatures.map((f) => ({
      href: `/features/${f.id}`,
      title: f.name,
      kind: 'Фича',
      moduleHref: '/features',
      updatedAt: f.updatedAt,
    })),
    ...pinnedRTBs.map((r) => ({
      href: `/marketing/${r.id}`,
      title: r.statement,
      kind: 'RTB',
      moduleHref: '/marketing',
      updatedAt: r.updatedAt,
    })),
    ...pinnedInsights.map((i) => ({
      href: `/insights/${i.id}`,
      title: insightKeyPhrase(i.text),
      fullTitle: i.text,
      kind: 'Инсайт',
      moduleHref: '/insights',
      updatedAt: i.updatedAt,
    })),
  ].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())

  const activityItems: FeedItem[] = [
    ...recentProducts.map((p) => ({
      href: `/products/${p.id}`,
      title: p.name,
      kind: 'Продукт',
      moduleHref: '/products',
      updatedAt: p.updatedAt,
      createdAt: p.createdAt,
    })),
    ...recentResearch.map((r) => ({
      href: `/research/${r.id}`,
      title: `#${r.number} ${r.title}`,
      kind: 'Исследование',
      moduleHref: '/research',
      updatedAt: r.updatedAt,
      createdAt: r.createdAt,
    })),
    ...recentSegments.map((s) => ({
      href: `/segments/${s.id}`,
      title: s.name,
      kind: 'Сегмент',
      moduleHref: '/segments',
      updatedAt: s.updatedAt,
      createdAt: s.createdAt,
    })),
    ...recentJtbds.map((j) => ({
      href: `/jtbd/${j.id}`,
      title: jtbdKeyPhrase(j.title),
      fullTitle: j.title,
      kind: 'JTBD',
      moduleHref: '/jtbd',
      updatedAt: j.updatedAt,
      createdAt: j.createdAt,
    })),
    ...recentHypotheses.map((h) => ({
      href: `/hypotheses/${h.id}`,
      title: hypothesisKeyPhrase(h.statement),
      fullTitle: h.statement,
      kind: 'Гипотеза',
      moduleHref: '/hypotheses',
      updatedAt: h.updatedAt,
      createdAt: h.createdAt,
    })),
    ...recentConversations.map((c) => ({
      href: `/conversations/${c.id}`,
      title: c.title,
      kind: 'Разговор',
      moduleHref: '/conversations',
      updatedAt: c.updatedAt,
      createdAt: c.createdAt,
    })),
    ...recentCompetitors.map((c) => ({
      href: `/competitors/${c.id}`,
      title: c.name,
      kind: 'Конкурент',
      moduleHref: '/competitors',
      updatedAt: c.updatedAt,
      createdAt: c.createdAt,
    })),
    ...recentFeatures.map((f) => ({
      href: `/features/${f.id}`,
      title: f.name,
      kind: 'Фича',
      moduleHref: '/features',
      updatedAt: f.updatedAt,
      createdAt: f.createdAt,
    })),
    ...recentRTBs.map((r) => ({
      href: `/marketing/${r.id}`,
      title: r.statement,
      kind: 'RTB',
      moduleHref: '/marketing',
      updatedAt: r.updatedAt,
      createdAt: r.createdAt,
    })),
    ...recentInsights.map((i) => ({
      href: `/insights/${i.id}`,
      title: insightKeyPhrase(i.text),
      fullTitle: i.text,
      kind: 'Инсайт',
      moduleHref: '/insights',
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

  // The dashboard already counts every module, so it derives the disclosure
  // stage from what it has instead of paying getNavStage's extra queries (C1).
  // Note the rail's counts cover only nav modules — Люди/Департаменты are not
  // on it — so this asks lib/nav-stage.ts only when the counts say "basic",
  // which is exactly when the answer could still be wrong.
  const navStage = Object.entries(counts).some(([href, n]) => n > 0 && !isBaseModule(href))
    ? 'full'
    : await getNavStage(userId)

  const featuredProduct = recentProducts[0]

  return (
    <main className="container py-12">
      <h1 className="text-3xl font-bold mb-2">RPM Platform</h1>
      <p className="text-muted-foreground mb-8">
        Платформа для управления продуктовыми исследованиями и сегментами клиентов
      </p>

      {featuredProduct ? (
        <Card variant="content" className="mb-8 border-l-4 border-primary">
          <CardContent className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-5">
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <productModule.icon
                  size={16}
                  strokeWidth={1.75}
                  className="shrink-0 text-primary"
                />
                <Link
                  href={`/products/${featuredProduct.id}`}
                  className="truncate font-display text-xl font-bold hover:underline"
                >
                  {featuredProduct.name}
                </Link>
                <Badge variant="outline">{stageLabels[featuredProduct.stage]}</Badge>
              </div>
              {featuredProduct.description && (
                <p className="max-w-2xl truncate text-sm text-muted-foreground">
                  {featuredProduct.description}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="font-mono text-sm text-muted-foreground">
                {productCount} {productCount === 1 ? 'продукт' : 'продуктов'}
              </span>
              <Link href="/products" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                Все продукты
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card variant="content" className="mb-8 border-l-4 border-primary">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
            <div>
              <p className="font-medium">Пока нет ни одного продукта</p>
              <p className="text-sm text-muted-foreground">
                Начните с создания продукта — остальные разделы строятся вокруг него.
              </p>
            </div>
            <Link href="/products/new" className={buttonVariants({ size: 'sm' })}>
              Создать продукт
            </Link>
          </CardContent>
        </Card>
      )}

      <ModuleRail counts={counts} autoStage={navStage} />

      <div className="mb-8">
        <Link href="/reports" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Отчёты: матрица Сегменты × JTBD, пробелы →
        </Link>
      </div>

      <DashboardWidgetGrid
        widgets={{
          'gaps-summary': <DashboardGapsSummary counts={gapsCounts} />,
          'jtbd-coverage': <DashboardJtbdCoverage coverage={jtbdCoverage} />,
          'discovery-chain': <DashboardDiscoveryChain counts={discoveryChain} />,
          'hypothesis-funnel': <DashboardHypothesisFunnel counts={hypothesisStatusCounts} />,
          'research-cadence': <DashboardResearchCadence data={researchCadence} />,
          'recently-viewed': <RecentlyViewedWidget />,
          pinned: pinnedItems.length > 0 && (
            <Card variant="content">
              <CardHeader className="border-l-4 border-primary">
                <CardTitle className="flex items-center gap-1.5 text-base">
                  <Star size={15} strokeWidth={1.75} className="text-primary" />
                  Закреплённое
                </CardTitle>
                <CardDescription>Важные записи, отмеченные звёздочкой</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {pinnedItems.map((item) => {
                    const Icon = moduleByHref[item.moduleHref]?.icon
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="flex items-center gap-2.5 px-6 py-2.5 text-sm hover:bg-accent/60"
                        >
                          {Icon && (
                            <Icon
                              size={14}
                              strokeWidth={1.75}
                              className="shrink-0 text-muted-foreground"
                            />
                          )}
                          <span
                            className="min-w-0 flex-1 truncate"
                            title={item.fullTitle ?? item.title}
                          >
                            {item.title}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {item.kind}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </CardContent>
            </Card>
          ),
          activity: activityItems.length > 0 && (
            <Card variant="content">
              <CardHeader className="border-l-4 border-primary">
                <CardTitle className="text-base">Последняя активность</CardTitle>
                <CardDescription>Что изменилось в последних записях</CardDescription>
              </CardHeader>
              <CardContent className="max-h-[420px] overflow-y-auto p-0">
                <ul className="divide-y">
                  {activityItems.map((item) => {
                    const Icon = moduleByHref[item.moduleHref]?.icon
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="flex items-center gap-2.5 px-6 py-2.5 text-sm hover:bg-accent/60"
                        >
                          {Icon && (
                            <Icon
                              size={14}
                              strokeWidth={1.75}
                              className="shrink-0 text-muted-foreground"
                            />
                          )}
                          <span
                            className="min-w-0 flex-1 truncate"
                            title={item.fullTitle ?? item.title}
                          >
                            {item.title}
                          </span>
                          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                            {item.createdAt && item.createdAt.getTime() === item.updatedAt.getTime()
                              ? 'создано'
                              : 'изменено'}{' '}
                            {item.updatedAt.toLocaleDateString('ru-RU', {
                              day: '2-digit',
                              month: '2-digit',
                            })}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </CardContent>
            </Card>
          ),
        }}
      />
    </main>
  )
}
