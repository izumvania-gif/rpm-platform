import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { deleteProduct } from '@/lib/actions/products'
import { deleteProductResource } from '@/lib/actions/product-resources'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DeleteButton } from '@/components/shared/delete-button'
import { PrintButton } from '@/components/shared/print-button'
import { CopyLinkButton } from '@/components/shared/copy-link-button'
import { RecentlyViewedTracker } from '@/components/shared/recently-viewed-tracker'
import { WelcomeChecklist } from '@/components/shared/welcome-checklist'
import { stageLabels, productResourceKindLabels } from '@/lib/labels'

export const dynamic = 'force-dynamic'

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const product = await prisma.product.findFirst({
    where: { id: params.id, userId: getCurrentUserId() },
    include: {
      researches: { orderBy: { date: 'desc' } },
      segments: { orderBy: { createdAt: 'desc' } },
      jtbds: { orderBy: { createdAt: 'desc' } },
      hypotheses: { orderBy: { createdAt: 'desc' } },
      conversations: { orderBy: { date: 'desc' } },
      competitors: { orderBy: { createdAt: 'desc' } },
      productResources: { orderBy: { createdAt: 'desc' } },
      features: { orderBy: { createdAt: 'desc' } },
      rtbs: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!product) notFound()

  const deleteProductWithId = deleteProduct.bind(null, product.id)

  const checklistItems = [
    {
      label: 'Добавить сегмент клиентов',
      done: product.segments.length > 0,
      href: `/segments/new?productId=${product.id}`,
      cta: 'Добавить',
    },
    {
      label: 'Добавить исследование',
      done: product.researches.length > 0,
      href: `/research/new?productId=${product.id}`,
      cta: 'Добавить',
    },
    {
      label: 'Добавить JTBD',
      done: product.jtbds.length > 0,
      href: `/jtbd/new?productId=${product.id}`,
      cta: 'Добавить',
    },
    {
      label: 'Добавить гипотезу',
      done: product.hypotheses.length > 0,
      href: `/hypotheses/new?productId=${product.id}`,
      cta: 'Добавить',
    },
  ]
  const isNearEmpty =
    product.segments.length +
      product.researches.length +
      product.jtbds.length +
      product.hypotheses.length <
    4

  return (
    <main className="container py-12 space-y-10">
      <RecentlyViewedTracker href={`/products/${product.id}`} title={product.name} kind="Продукт" />
      {isNearEmpty && <WelcomeChecklist productId={product.id} items={checklistItems} />}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <div className="flex flex-wrap gap-2 print:hidden">
            <PrintButton />
            <CopyLinkButton />
            <Link
              href={`/products/${product.id}/edit`}
              className={buttonVariants({ variant: 'outline' })}
            >
              Редактировать
            </Link>
            <DeleteButton
              action={deleteProductWithId}
              confirmMessage="Удалить продукт вместе со всеми исследованиями и сегментами?"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <Badge variant="secondary">{stageLabels[product.stage]}</Badge>
          <span className="text-sm text-muted-foreground">{product.slug}</span>
        </div>
        {product.description && (
          <p className="text-muted-foreground max-w-2xl">{product.description}</p>
        )}
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Исследования ({product.researches.length})</h2>
          <Link
            href={`/research/new?productId=${product.id}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' print:hidden'}
          >
            Добавить исследование
          </Link>
        </div>
        {product.researches.length === 0 ? (
          <p className="text-sm text-muted-foreground">Пока нет исследований.</p>
        ) : (
          <ul className="space-y-2">
            {product.researches.map((r) => (
              <li key={r.id}>
                <Link href={`/research/${r.id}`} className="text-sm hover:underline">
                  #{r.number} {r.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Сегменты ({product.segments.length})</h2>
          <Link
            href={`/segments/new?productId=${product.id}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' print:hidden'}
          >
            Добавить сегмент
          </Link>
        </div>
        {product.segments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Пока нет сегментов.</p>
        ) : (
          <ul className="space-y-2">
            {product.segments.map((s) => (
              <li key={s.id}>
                <Link href={`/segments/${s.id}`} className="text-sm hover:underline">
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">JTBD ({product.jtbds.length})</h2>
          <Link
            href={`/jtbd/new?productId=${product.id}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' print:hidden'}
          >
            Добавить JTBD
          </Link>
        </div>
        {product.jtbds.length === 0 ? (
          <p className="text-sm text-muted-foreground">Пока нет JTBD.</p>
        ) : (
          <ul className="space-y-2">
            {product.jtbds.map((j) => (
              <li key={j.id}>
                <Link href={`/jtbd/${j.id}`} className="text-sm hover:underline">
                  {j.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Гипотезы ({product.hypotheses.length})</h2>
          <Link
            href={`/hypotheses/new?productId=${product.id}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' print:hidden'}
          >
            Добавить гипотезу
          </Link>
        </div>
        {product.hypotheses.length === 0 ? (
          <p className="text-sm text-muted-foreground">Пока нет гипотез.</p>
        ) : (
          <ul className="space-y-2">
            {product.hypotheses.map((h) => (
              <li key={h.id}>
                <Link href={`/hypotheses/${h.id}`} className="text-sm hover:underline">
                  {h.statement}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Разговоры ({product.conversations.length})</h2>
          <Link
            href={`/conversations/new?productId=${product.id}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' print:hidden'}
          >
            Добавить разговор
          </Link>
        </div>
        {product.conversations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Пока нет разговоров.</p>
        ) : (
          <ul className="space-y-2">
            {product.conversations.map((c) => (
              <li key={c.id}>
                <Link href={`/conversations/${c.id}`} className="text-sm hover:underline">
                  {c.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Конкуренты ({product.competitors.length})</h2>
          <Link
            href={`/competitors/new?productId=${product.id}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' print:hidden'}
          >
            Добавить конкурента
          </Link>
        </div>
        {product.competitors.length === 0 ? (
          <p className="text-sm text-muted-foreground">Пока нет конкурентов.</p>
        ) : (
          <ul className="space-y-2">
            {product.competitors.map((c) => (
              <li key={c.id}>
                <Link href={`/competitors/${c.id}`} className="text-sm hover:underline">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Фичи ({product.features.length})</h2>
          <Link
            href={`/features/new?productId=${product.id}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' print:hidden'}
          >
            Добавить фичу
          </Link>
        </div>
        {product.features.length === 0 ? (
          <p className="text-sm text-muted-foreground">Пока нет фич.</p>
        ) : (
          <ul className="space-y-2">
            {product.features.map((f) => (
              <li key={f.id}>
                <Link href={`/features/${f.id}`} className="text-sm hover:underline">
                  {f.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">RTB ({product.rtbs.length})</h2>
          <Link
            href={`/rtb/new?productId=${product.id}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' print:hidden'}
          >
            Добавить RTB
          </Link>
        </div>
        {product.rtbs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Пока нет RTB.</p>
        ) : (
          <ul className="space-y-2">
            {product.rtbs.map((r) => (
              <li key={r.id}>
                <Link href={`/rtb/${r.id}`} className="text-sm hover:underline">
                  {r.statement}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Ресурсы ({product.productResources.length})</h2>
          <Link
            href={`/resources/new?productId=${product.id}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' print:hidden'}
          >
            Добавить ресурс
          </Link>
        </div>
        {product.productResources.length === 0 ? (
          <p className="text-sm text-muted-foreground">Пока нет ресурсов.</p>
        ) : (
          <ul className="space-y-2">
            {product.productResources.map((resource) => (
              <li key={resource.id} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  <Badge variant="outline" className="mr-2">
                    {productResourceKindLabels[resource.kind]}
                  </Badge>
                  {resource.url ? (
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      {resource.title}
                    </a>
                  ) : (
                    resource.title
                  )}
                </span>
                <span className="flex items-center gap-2 print:hidden">
                  <Link
                    href={`/resources/${resource.id}/edit`}
                    className="text-muted-foreground hover:underline"
                  >
                    Редактировать
                  </Link>
                  <DeleteButton action={deleteProductResource.bind(null, resource.id)} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
