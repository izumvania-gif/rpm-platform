import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { deleteProduct, updateProductField } from '@/lib/actions/products'
import { deleteProductResource } from '@/lib/actions/product-resources'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DeleteButton } from '@/components/shared/delete-button'
import { PrintButton } from '@/components/shared/print-button'
import { CopyLinkButton } from '@/components/shared/copy-link-button'
import { RecentlyViewedTracker } from '@/components/shared/recently-viewed-tracker'
import { WelcomeChecklist } from '@/components/shared/welcome-checklist'
import { SectionHeading } from '@/components/shared/section-heading'
import { InlineEditableField } from '@/components/shared/inline-editable-field'
import { researchGroupMeta, positioningGroupMeta } from '@/lib/module-meta'
import { stageLabels, productResourceKindLabels } from '@/lib/labels'

export const dynamic = 'force-dynamic'

function ProductSection({
  title,
  count,
  addHref,
  addLabel,
  emptyLabel,
  items,
}: {
  title: string
  count: number
  addHref: string
  addLabel: string
  emptyLabel: string
  items: { href: string; label: string }[]
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base font-semibold">
          {title} <span className="font-normal text-muted-foreground">({count})</span>
        </CardTitle>
        <Link
          href={addHref}
          className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' shrink-0 print:hidden'}
        >
          {addLabel}
        </Link>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-sm hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const userId = getCurrentUserId()
  const [product, people, departments] = await Promise.all([
    prisma.product.findFirst({
      where: { id: params.id, userId },
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
        insights: { orderBy: { createdAt: 'desc' } },
      },
    }),
    prisma.person.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    prisma.department.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
  ])

  if (!product) notFound()

  const ownerOptions = [
    { value: '', label: 'Не указан' },
    ...people.map((p) => ({ value: p.id, label: p.name })),
  ]
  const ownerLabels = Object.fromEntries(people.map((p) => [p.id, p.name]))

  const departmentOptions = [
    { value: '', label: 'Без департамента' },
    ...departments.map((d) => ({ value: d.id, label: d.name })),
  ]
  const departmentLabels = Object.fromEntries(departments.map((d) => [d.id, d.name]))

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
          <h1 className="text-2xl font-bold">
            <InlineEditableField
              value={product.name}
              action={updateProductField.bind(null, product.id, 'name')}
            />
          </h1>
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
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <InlineEditableField
            value={product.stage}
            type="select"
            options={Object.entries(stageLabels).map(([value, label]) => ({ value, label }))}
            action={updateProductField.bind(null, product.id, 'stage')}
            display="badge"
            labels={stageLabels}
          />
          <span className="text-sm text-muted-foreground">{product.slug}</span>
          <span className="text-sm text-muted-foreground">
            Ответственный:{' '}
            <InlineEditableField
              value={product.ownerId ?? ''}
              type="select"
              options={ownerOptions}
              labels={ownerLabels}
              placeholder="+ назначить"
              action={updateProductField.bind(null, product.id, 'ownerId')}
            />
          </span>
          <span className="text-sm text-muted-foreground">
            Департамент:{' '}
            <InlineEditableField
              value={product.departmentId ?? ''}
              type="select"
              options={departmentOptions}
              labels={departmentLabels}
              placeholder="+ назначить"
              action={updateProductField.bind(null, product.id, 'departmentId')}
            />
          </span>
        </div>
        <p className="text-muted-foreground max-w-2xl">
          <InlineEditableField
            value={product.description ?? ''}
            type="textarea"
            action={updateProductField.bind(null, product.id, 'description')}
          />
        </p>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          <span className="text-xs uppercase tracking-wide">
            Публично (для дашборда компании):{' '}
          </span>
          <InlineEditableField
            value={product.publicSummary ?? ''}
            type="textarea"
            placeholder="+ добавить публичное описание"
            action={updateProductField.bind(null, product.id, 'publicSummary')}
          />
        </p>
      </div>

      <div className="space-y-5">
        <SectionHeading
          title={researchGroupMeta.title}
          description={researchGroupMeta.description}
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ProductSection
            title="Исследования"
            count={product.researches.length}
            addHref={`/research/new?productId=${product.id}`}
            addLabel="Добавить исследование"
            emptyLabel="Пока нет исследований."
            items={product.researches.map((r) => ({
              href: `/research/${r.id}`,
              label: `#${r.number} ${r.title}`,
            }))}
          />
          <ProductSection
            title="Сегменты"
            count={product.segments.length}
            addHref={`/segments/new?productId=${product.id}`}
            addLabel="Добавить сегмент"
            emptyLabel="Пока нет сегментов."
            items={product.segments.map((s) => ({ href: `/segments/${s.id}`, label: s.name }))}
          />
          <ProductSection
            title="JTBD"
            count={product.jtbds.length}
            addHref={`/jtbd/new?productId=${product.id}`}
            addLabel="Добавить JTBD"
            emptyLabel="Пока нет JTBD."
            items={product.jtbds.map((j) => ({ href: `/jtbd/${j.id}`, label: j.title }))}
          />
          <ProductSection
            title="Гипотезы"
            count={product.hypotheses.length}
            addHref={`/hypotheses/new?productId=${product.id}`}
            addLabel="Добавить гипотезу"
            emptyLabel="Пока нет гипотез."
            items={product.hypotheses.map((h) => ({
              href: `/hypotheses/${h.id}`,
              label: h.statement,
            }))}
          />
          <ProductSection
            title="Разговоры"
            count={product.conversations.length}
            addHref={`/conversations/new?productId=${product.id}`}
            addLabel="Добавить разговор"
            emptyLabel="Пока нет разговоров."
            items={product.conversations.map((c) => ({
              href: `/conversations/${c.id}`,
              label: c.title,
            }))}
          />
          <ProductSection
            title="Инсайты"
            count={product.insights.length}
            addHref={`/insights/new?productId=${product.id}`}
            addLabel="Добавить инсайт"
            emptyLabel="Пока нет инсайтов."
            items={product.insights.map((i) => ({
              href: `/insights/${i.id}`,
              label: i.text,
            }))}
          />
        </div>
      </div>

      <div className="space-y-5">
        <SectionHeading
          title={positioningGroupMeta.title}
          description={positioningGroupMeta.description}
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <ProductSection
            title="Конкуренты"
            count={product.competitors.length}
            addHref={`/competitors/new?productId=${product.id}`}
            addLabel="Добавить конкурента"
            emptyLabel="Пока нет конкурентов."
            items={product.competitors.map((c) => ({
              href: `/competitors/${c.id}`,
              label: c.name,
            }))}
          />
          <ProductSection
            title="Фичи"
            count={product.features.length}
            addHref={`/features/new?productId=${product.id}`}
            addLabel="Добавить фичу"
            emptyLabel="Пока нет фич."
            items={product.features.map((f) => ({ href: `/features/${f.id}`, label: f.name }))}
          />
          <ProductSection
            title="Маркетинг"
            count={product.rtbs.length}
            addHref={`/marketing/new?productId=${product.id}`}
            addLabel="Добавить RTB"
            emptyLabel="Пока нет RTB."
            items={product.rtbs.map((r) => ({ href: `/marketing/${r.id}`, label: r.statement }))}
          />
        </div>
      </div>

      <div className="space-y-5">
        <SectionHeading
          title="Ресурсы"
          description="Sales-kit, документация, ссылки на Confluence/Jira"
        />
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base font-semibold">
              Ресурсы{' '}
              <span className="font-normal text-muted-foreground">
                ({product.productResources.length})
              </span>
            </CardTitle>
            <Link
              href={`/resources/new?productId=${product.id}`}
              className={
                buttonVariants({ variant: 'outline', size: 'sm' }) + ' shrink-0 print:hidden'
              }
            >
              Добавить ресурс
            </Link>
          </CardHeader>
          <CardContent>
            {product.productResources.length === 0 ? (
              <p className="text-sm text-muted-foreground">Пока нет ресурсов.</p>
            ) : (
              <ul className="space-y-2">
                {product.productResources.map((resource) => (
                  <li
                    key={resource.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
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
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
