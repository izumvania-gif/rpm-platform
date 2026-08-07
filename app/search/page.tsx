import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'

export const dynamic = 'force-dynamic'

const RESULT_LIMIT = 20

interface SearchResult {
  href: string
  title: string
}

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? '').trim()

  if (!q) {
    return (
      <main className="container py-12">
        <h1 className="text-2xl font-bold mb-2">Поиск</h1>
        <p className="text-muted-foreground">Введите запрос в поле поиска в шапке.</p>
      </main>
    )
  }

  const userId = getCurrentUserId()
  const ci = { contains: q, mode: 'insensitive' as const }

  const [
    products,
    researches,
    segments,
    jtbds,
    hypotheses,
    conversations,
    competitors,
    features,
    rtbs,
    insights,
  ] = await Promise.all([
    prisma.product.findMany({
      where: { userId, OR: [{ name: ci }, { description: ci }] },
      take: RESULT_LIMIT,
    }),
    prisma.research.findMany({
      where: { userId, OR: [{ title: ci }, { description: ci }] },
      take: RESULT_LIMIT,
    }),
    prisma.segment.findMany({
      where: { userId, OR: [{ name: ci }, { description: ci }] },
      take: RESULT_LIMIT,
    }),
    prisma.jTBD.findMany({
      where: { userId, OR: [{ title: ci }, { description: ci }, { category: ci }] },
      take: RESULT_LIMIT,
    }),
    prisma.hypothesis.findMany({
      where: { userId, statement: ci },
      take: RESULT_LIMIT,
    }),
    prisma.conversation.findMany({
      where: { userId, OR: [{ title: ci }, { transcript: ci }] },
      take: RESULT_LIMIT,
    }),
    prisma.competitor.findMany({
      where: { userId, OR: [{ name: ci }, { positioning: ci }] },
      take: RESULT_LIMIT,
    }),
    prisma.feature.findMany({
      where: { userId, OR: [{ name: ci }, { description: ci }] },
      take: RESULT_LIMIT,
    }),
    prisma.rTB.findMany({
      where: { userId, statement: ci },
      take: RESULT_LIMIT,
    }),
    prisma.insight.findMany({
      where: { userId, text: ci },
      take: RESULT_LIMIT,
    }),
  ])

  const sections: { label: string; results: SearchResult[] }[] = [
    {
      label: 'Продукты',
      results: products.map((p) => ({ href: `/products/${p.id}`, title: p.name })),
    },
    {
      label: 'Исследования',
      results: researches.map((r) => ({
        href: `/research/${r.id}`,
        title: `#${r.number} ${r.title}`,
      })),
    },
    {
      label: 'Сегменты',
      results: segments.map((s) => ({ href: `/segments/${s.id}`, title: s.name })),
    },
    { label: 'JTBD', results: jtbds.map((j) => ({ href: `/jtbd/${j.id}`, title: j.title })) },
    {
      label: 'Гипотезы',
      results: hypotheses.map((h) => ({ href: `/hypotheses/${h.id}`, title: h.statement })),
    },
    {
      label: 'Разговоры',
      results: conversations.map((c) => ({ href: `/conversations/${c.id}`, title: c.title })),
    },
    {
      label: 'Конкуренты',
      results: competitors.map((c) => ({ href: `/competitors/${c.id}`, title: c.name })),
    },
    {
      label: 'Фичи',
      results: features.map((f) => ({ href: `/features/${f.id}`, title: f.name })),
    },
    {
      label: 'Маркетинг (RTB)',
      results: rtbs.map((r) => ({ href: `/marketing/${r.id}`, title: r.statement })),
    },
    {
      label: 'Инсайты',
      results: insights.map((i) => ({ href: `/insights/${i.id}`, title: i.text })),
    },
  ].filter((section) => section.results.length > 0)

  const totalCount = sections.reduce((sum, section) => sum + section.results.length, 0)

  return (
    <main className="container py-12">
      <h1 className="text-2xl font-bold mb-2">Поиск: «{q}»</h1>
      <p className="text-sm text-muted-foreground mb-8">
        {totalCount === 0 ? 'Ничего не найдено.' : `Найдено записей: ${totalCount}`}
      </p>

      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.label}>
            <h2 className="text-lg font-semibold mb-3">
              {section.label}{' '}
              <span className="text-muted-foreground font-normal">({section.results.length})</span>
            </h2>
            <ul className="space-y-2">
              {section.results.map((result) => (
                <li key={result.href} className="rounded-md border p-3">
                  <Link href={result.href} className="line-clamp-2 text-sm hover:underline">
                    {result.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  )
}
