import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { buttonVariants } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function OnboardingDonePage({ params }: { params: { id: string } }) {
  const userId = getCurrentUserId()
  const product = await prisma.product.findFirst({ where: { id: params.id, userId } })
  if (!product) notFound()

  const [
    segments,
    jtbds,
    research,
    conversations,
    insights,
    hypotheses,
    competitors,
    team,
    features,
    rtbs,
  ] = await Promise.all([
    prisma.segment.count({ where: { productId: product.id, userId } }),
    prisma.jTBD.count({ where: { productId: product.id, userId } }),
    prisma.research.count({ where: { productId: product.id, userId } }),
    prisma.conversation.count({ where: { productId: product.id, userId } }),
    prisma.insight.count({ where: { productId: product.id, userId } }),
    prisma.hypothesis.count({ where: { productId: product.id, userId } }),
    prisma.competitor.count({ where: { productId: product.id, userId } }),
    prisma.productTeamMember.count({ where: { productId: product.id } }),
    prisma.feature.count({ where: { productId: product.id, userId } }),
    prisma.rTB.count({ where: { productId: product.id, userId } }),
  ])

  const rows: { label: string; count: number; href: string }[] = [
    { label: 'Сегменты', count: segments, href: `/products/${product.id}/onboarding/segments` },
    { label: 'JTBD', count: jtbds, href: `/products/${product.id}/onboarding/jtbd` },
    { label: 'Исследования', count: research, href: `/products/${product.id}/onboarding/research` },
    {
      label: 'Разговоры',
      count: conversations,
      href: `/products/${product.id}/onboarding/research`,
    },
    { label: 'Инсайты', count: insights, href: `/products/${product.id}/onboarding/research` },
    { label: 'Гипотезы', count: hypotheses, href: `/products/${product.id}/onboarding/hypotheses` },
    {
      label: 'Конкуренты',
      count: competitors,
      href: `/products/${product.id}/onboarding/competitors`,
    },
    { label: 'Команда', count: team, href: `/products/${product.id}/onboarding/people` },
    { label: 'Фичи', count: features, href: `/products/${product.id}/onboarding/features` },
    { label: 'RTB', count: rtbs, href: `/products/${product.id}/onboarding/features` },
  ]

  return (
    <main className="container max-w-3xl space-y-8 py-12">
      <div>
        <h1 className="mb-1 text-2xl font-bold">Настройка продукта завершена</h1>
        <p className="text-muted-foreground">
          Вот что вы уже успели заполнить для «{product.name}». Пустые разделы можно дозаполнить в
          любой момент со страницы продукта.
        </p>
      </div>

      <ul className="divide-y rounded-md border">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between px-4 py-3 text-sm">
            <span>{row.label}</span>
            <div className="flex items-center gap-3">
              <span className={row.count === 0 ? 'text-muted-foreground' : 'font-medium'}>
                {row.count === 0 ? 'пусто' : row.count}
              </span>
              <Link href={row.href} className="text-xs text-primary hover:underline">
                {row.count === 0 ? 'заполнить' : 'изменить'}
              </Link>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex justify-end border-t pt-6">
        <Link href={`/products/${product.id}`} className={buttonVariants()}>
          Перейти к продукту →
        </Link>
      </div>
    </main>
  )
}
