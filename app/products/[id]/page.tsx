import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { pluralizeRu } from '@/lib/plural'
import { deleteProduct, updateProductField } from '@/lib/actions/products'
import { deleteProductResource } from '@/lib/actions/product-resources'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DeleteButton } from '@/components/shared/delete-button'
import { PrintButton } from '@/components/shared/print-button'
import { CopyLinkButton } from '@/components/shared/copy-link-button'
import { RecentlyViewedTracker } from '@/components/shared/recently-viewed-tracker'
import { RecordCrumbs } from '@/components/shared/record-crumbs'
import { ActivateProductOnOpen } from '@/components/shared/activate-product-on-open'
import { getActiveProductId } from '@/lib/product-context.server'
import { WelcomeChecklist } from '@/components/shared/welcome-checklist'
import { SectionHeading } from '@/components/shared/section-heading'
import { ProductModuleCard } from '@/components/products/module-card'
import { buildModuleRows, type OverviewRow } from '@/lib/product-overview'
import { hypothesisKeyPhrase, insightKeyPhrase, jtbdKeyPhrase } from '@/lib/key-phrase'
import { DRAFT_STUCK_AFTER_MS } from '@/lib/dashboard-metrics'
import { hypothesisStatusLabels } from '@/lib/labels'
import { InlineEditableField } from '@/components/shared/inline-editable-field'
import { researchGroupMeta, positioningGroupMeta } from '@/lib/module-meta'
import { isStale } from '@/lib/utils'
import { stageLabels, productResourceKindLabels } from '@/lib/labels'
import { BulkAddPanel } from '@/components/shared/bulk-add-panel'
import { CsvImportPanel } from '@/components/shared/csv-import-panel'
import { StarterTemplatePanel } from '@/components/shared/starter-template-panel'
import { templateSummaries } from '@/lib/starter-templates'
import { recordTitle } from '@/lib/record-title'
import { getProductTeam } from '@/lib/team-workload'
import { pmTabHref } from '@/lib/pm-nav'
import { nextMilestone, roadmapStatusCounts } from '@/lib/product-delivery'
import { roadmapStatusLabels, roadmapStatusOrder } from '@/lib/labels'
import { PersonAvatar } from '@/components/shared/person-avatar'

// Заголовок вкладки — имя записи (фаза 15). Один лёгкий запрос по нужному
// полю, см. lib/record-title.ts; отсутствующую запись обработает сама страница.
export async function generateMetadata({ params }: { params: { id: string } }) {
  return { title: await recordTitle('product', params.id, 'Продукт') }
}

export const dynamic = 'force-dynamic'

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const userId = getCurrentUserId()
  const [product, people, departments] = await Promise.all([
    prisma.product.findFirst({
      where: { id: params.id, userId },
      include: {
        researches: { orderBy: { date: 'desc' } },
        // The per-record relation counts below are what make the module cards
        // actionable rather than decorative: a segment with no jobs and a
        // feature with no marketing claim are the rows worth surfacing first.
        segments: {
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { jtbds: true } } },
        },
        jtbds: { orderBy: { createdAt: 'desc' } },
        hypotheses: { orderBy: { createdAt: 'desc' } },
        conversations: {
          orderBy: { date: 'desc' },
          include: { _count: { select: { insights: true } } },
        },
        competitors: { orderBy: { createdAt: 'desc' } },
        productResources: { orderBy: { createdAt: 'desc' } },
        features: {
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { rtbs: true } } },
        },
        rtbs: {
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { features: true } } },
        },
        insights: { orderBy: { createdAt: 'desc' } },
        // Блок «Доставка» (фаза 21): те же факты, что на вкладках /pm, но в
        // одну строку каждый — статусы роадмапа, ближайшая веха, счётчики.
        roadmapItems: {
          select: { id: true, title: true, status: true, startDate: true, isMilestone: true },
        },
        _count: { select: { processes: true, actionPlans: true } },
      },
    }),
    prisma.person.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    prisma.department.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
  ])

  if (!product) notFound()

  const [activeProductId, team] = await Promise.all([
    getActiveProductId(userId),
    // Та же команда, что на /pm/team: явный состав плюс те, у кого есть работа.
    getProductTeam(userId, product.id),
  ])

  const statusCounts = roadmapStatusCounts(product.roadmapItems)
  const milestone = nextMilestone(product.roadmapItems, new Date())
  const MAX_TEAM_SHOWN = 5

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

  // Every module card's rows. Each rule below names a state the app already
  // tracks but never showed here — the point of the card is to surface the
  // record you should act on, not the record you happened to add last.
  const shortDate = (date: Date) =>
    date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })

  const researchRows: OverviewRow[] = product.researches.map((r) => ({
    href: `/research/${r.id}`,
    label: `#${r.number} ${r.title}`,
    meta: shortDate(r.date),
    attentionHint: isStale(r.date) ? 'Давно не обновлялось' : undefined,
  }))

  const segmentRows: OverviewRow[] = product.segments.map((seg) => ({
    href: `/segments/${seg.id}`,
    label: seg.name,
    meta: `${seg._count.jtbds} JTBD`,
    attentionHint: seg._count.jtbds === 0 ? 'Ни одной задачи клиента' : undefined,
  }))

  const jtbdRows: OverviewRow[] = product.jtbds.map((j) => ({
    href: `/jtbd/${j.id}`,
    label: jtbdKeyPhrase(j.title),
    fullLabel: j.title,
    attentionHint: j.confirmed ? undefined : 'Не подтверждён исследованием',
  }))

  const hypothesisRows: OverviewRow[] = product.hypotheses.map((h) => ({
    href: `/hypotheses/${h.id}`,
    label: hypothesisKeyPhrase(h.statement),
    fullLabel: h.statement,
    meta: hypothesisStatusLabels[h.status],
    // The same "stuck" definition /reports/gaps uses, imported rather than
    // re-guessed, so the two pages can never disagree about the threshold.
    attentionHint:
      h.status === 'DRAFT' && Date.now() - h.updatedAt.getTime() > DRAFT_STUCK_AFTER_MS
        ? 'Висит в черновике больше двух недель'
        : undefined,
  }))

  const conversationRows: OverviewRow[] = product.conversations.map((c) => ({
    href: `/conversations/${c.id}`,
    label: c.title,
    meta: shortDate(c.date),
    attentionHint: c._count.insights === 0 ? 'Из разговора не извлечён ни один инсайт' : undefined,
  }))

  const insightRows: OverviewRow[] = product.insights.map((i) => ({
    href: `/insights/${i.id}`,
    label: insightKeyPhrase(i.text),
    fullLabel: i.text,
    attentionHint:
      !i.segmentId && !i.jtbdId && !i.researchId && !i.conversationId
        ? 'Ни с чем не связан'
        : undefined,
  }))

  const competitorRows: OverviewRow[] = product.competitors.map((c) => ({
    href: `/competitors/${c.id}`,
    label: c.name,
    meta: c.lastCheckedAt ? shortDate(c.lastCheckedAt) : 'не проверяли',
    attentionHint: !c.lastCheckedAt || isStale(c.lastCheckedAt) ? 'Давно не проверяли' : undefined,
  }))

  const featureRows: OverviewRow[] = product.features.map((f) => ({
    href: `/features/${f.id}`,
    label: f.name,
    meta: pluralizeRu(f._count.rtbs, ['обещание', 'обещания', 'обещаний']),
    attentionHint: f._count.rtbs === 0 ? 'Нет обещания' : undefined,
  }))

  const rtbRows: OverviewRow[] = product.rtbs.map((r) => ({
    href: `/marketing/${r.id}`,
    label: r.statement,
    meta: pluralizeRu(r._count.features, ['фича', 'фичи', 'фич']),
    attentionHint: r._count.features === 0 ? 'Не опирается ни на одну фичу' : undefined,
  }))

  return (
    <main className="container py-12 space-y-10">
      <RecentlyViewedTracker href={`/products/${product.id}`} title={product.name} kind="Продукт" />
      {/* Открыть карточку продукта — значит, выбрать его. Дальше вся цепочка
          и витрины идут за этим продуктом (фаза 14). */}
      <ActivateProductOnOpen productId={product.id} activeProductId={activeProductId} />
      <RecordCrumbs items={[{ href: '/products', label: 'Продукты' }]} />
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
              confirmMessage="Удалить продукт со всем его содержимым?"
              impact={{ model: 'product', id: product.id }}
              name={product.name}
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

      {/* Bulk entry (plans/2.0-product-leap-plan.md, A1 + A2) — sits above the
          module sections because it fills several of them at once. */}
      <div className="flex flex-wrap items-start gap-2 print:hidden">
        {/* The canvas (C2) leads, because it is the one view that shows the
            whole chain at once rather than filling one more list. */}
        <Link href={`/products/${product.id}/canvas`} className={buttonVariants({ size: 'sm' })}>
          Холст продукта
        </Link>
        {/* Next to the canvas because it is the other half of the same job:
            the canvas draws the chain, this one fills it in in bulk. */}
        <Link
          href={`/products/${product.id}/links`}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          Связи
        </Link>
        <Link
          href={`/inbox?productId=${product.id}`}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          Инбокс
        </Link>
        <BulkAddPanel productId={product.id} />
        <CsvImportPanel productId={product.id} />
        {/* Starter templates (A4) only while the product is still near-empty —
            once it has real content, a one-click bulk insert of plausible
            filler is noise rather than a head start. */}
        {isNearEmpty && (
          <StarterTemplatePanel productId={product.id} templates={templateSummaries()} />
        )}
      </div>

      <div className="space-y-5">
        <SectionHeading
          title={researchGroupMeta.title}
          description={researchGroupMeta.description}
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ProductModuleCard
            title="Исследования"
            data={buildModuleRows(researchRows)}
            addHref={`/research/new?productId=${product.id}`}
            addLabel="Добавить исследование"
            productId={product.id}
            allHref="/research"
            emptyLabel="Пока нет исследований."
            attentionLabel="давно не обновлялись"
          />
          <ProductModuleCard
            title="Сегменты"
            data={buildModuleRows(segmentRows)}
            addHref={`/segments/new?productId=${product.id}`}
            addLabel="Добавить сегмент"
            addType="segment"
            productId={product.id}
            allHref="/segments"
            emptyLabel="Пока нет сегментов."
            attentionLabel="без задач"
          />
          <ProductModuleCard
            title="JTBD"
            data={buildModuleRows(jtbdRows)}
            addHref={`/jtbd/new?productId=${product.id}`}
            addLabel="Добавить JTBD"
            addType="jtbd"
            productId={product.id}
            allHref="/jtbd"
            emptyLabel="Пока нет JTBD."
            attentionLabel="не подтверждены"
          />
          <ProductModuleCard
            title="Гипотезы"
            data={buildModuleRows(hypothesisRows)}
            addHref={`/hypotheses/new?productId=${product.id}`}
            addLabel="Добавить гипотезу"
            addType="hypothesis"
            productId={product.id}
            allHref="/hypotheses"
            emptyLabel="Пока нет гипотез."
            attentionLabel="зависли в черновике"
          />
          <ProductModuleCard
            title="Разговоры"
            data={buildModuleRows(conversationRows)}
            addHref={`/conversations/new?productId=${product.id}`}
            addLabel="Добавить разговор"
            productId={product.id}
            allHref="/conversations"
            emptyLabel="Пока нет разговоров."
            attentionLabel="без инсайтов"
          />
          <ProductModuleCard
            title="Инсайты"
            data={buildModuleRows(insightRows)}
            addHref={`/insights/new?productId=${product.id}`}
            addLabel="Добавить инсайт"
            addType="insight"
            productId={product.id}
            allHref="/insights"
            emptyLabel="Пока нет инсайтов."
            attentionLabel="ни с чем не связаны"
          />
        </div>
      </div>

      <div className="space-y-5">
        <SectionHeading
          title={positioningGroupMeta.title}
          description={positioningGroupMeta.description}
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <ProductModuleCard
            title="Конкуренты"
            data={buildModuleRows(competitorRows)}
            addHref={`/competitors/new?productId=${product.id}`}
            addLabel="Добавить конкурента"
            addType="competitor"
            productId={product.id}
            allHref="/competitors"
            emptyLabel="Пока нет конкурентов."
            attentionLabel="давно не проверяли"
          />
          <ProductModuleCard
            title="Фичи"
            data={buildModuleRows(featureRows)}
            addHref={`/features/new?productId=${product.id}`}
            addLabel="Добавить фичу"
            addType="feature"
            productId={product.id}
            allHref="/features"
            emptyLabel="Пока нет фич."
            attentionLabel="без обещаний"
          />
          <ProductModuleCard
            title="Обещания"
            data={buildModuleRows(rtbRows)}
            addHref={`/marketing/new?productId=${product.id}`}
            addLabel="Добавить обещание"
            addType="rtb"
            productId={product.id}
            allHref="/marketing"
            emptyLabel="Пока нет обещаний."
            attentionLabel="без опоры на фичу"
          />
        </div>
      </div>

      {/* Доставка и витрины (фаза 21 аудита 2.3). Карточка продукта была
          хабом только дискавери — всё, что происходит с продуктом дальше, жило
          на /pm и в отчётах, и отсюда туда не вело ничего, кроме меню. */}
      <div className="space-y-5">
        <SectionHeading
          title="Доставка и витрины"
          description="Что с продуктом происходит после дискавери — и где на него смотрят другие"
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-baseline justify-between gap-2 space-y-0 pb-3">
              <CardTitle className="text-base font-semibold">Доставка</CardTitle>
              <Link
                href={pmTabHref('/pm/roadmap', product.id)}
                className="shrink-0 text-sm text-muted-foreground hover:underline print:hidden"
              >
                Открыть →
              </Link>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
                <dt className="text-muted-foreground">Роадмап</dt>
                <dd>
                  {product.roadmapItems.length === 0 ? (
                    <Link
                      href={pmTabHref('/pm/roadmap', product.id)}
                      className="text-muted-foreground hover:underline"
                    >
                      пока пусто — добавить пункт
                    </Link>
                  ) : (
                    <span className="flex flex-wrap gap-x-3 gap-y-1">
                      {roadmapStatusOrder
                        .filter((status) => statusCounts[status] > 0)
                        .map((status) => (
                          <span key={status}>
                            <span className="font-mono tabular-nums">{statusCounts[status]}</span>{' '}
                            <span className="text-muted-foreground">
                              {roadmapStatusLabels[status].toLowerCase()}
                            </span>
                          </span>
                        ))}
                    </span>
                  )}
                </dd>
                <dt className="text-muted-foreground">Ближайшая веха</dt>
                <dd>
                  {milestone ? (
                    <Link
                      href={pmTabHref('/pm/gantt', product.id)}
                      className="hover:underline"
                      title={milestone.title}
                    >
                      {milestone.title} ·{' '}
                      {milestone.startDate!.toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">не назначена</span>
                  )}
                </dd>
                <dt className="text-muted-foreground">Процессы</dt>
                <dd>
                  <Link href={pmTabHref('/pm/processes', product.id)} className="hover:underline">
                    {pluralizeRu(product._count.processes, ['процесс', 'процесса', 'процессов'])}
                  </Link>
                  <span className="text-muted-foreground"> · </span>
                  <Link
                    href={pmTabHref('/pm/action-plans', product.id)}
                    className="hover:underline"
                  >
                    {pluralizeRu(product._count.actionPlans, [
                      'экшн-план',
                      'экшн-плана',
                      'экшн-планов',
                    ])}
                  </Link>
                </dd>
                <dt className="text-muted-foreground">Команда</dt>
                <dd>
                  {team.length === 0 ? (
                    <Link
                      href={pmTabHref('/pm/team', product.id)}
                      className="text-muted-foreground hover:underline"
                    >
                      никого — собрать команду
                    </Link>
                  ) : (
                    <Link
                      href={pmTabHref('/pm/team', product.id)}
                      className="flex flex-wrap items-center gap-1.5 hover:underline"
                    >
                      <span className="flex -space-x-1.5">
                        {team.slice(0, MAX_TEAM_SHOWN).map(({ person }) => (
                          <PersonAvatar
                            key={person.id}
                            name={person.name}
                            avatarUrl={person.avatarUrl}
                            size="sm"
                            className="ring-2 ring-background"
                          />
                        ))}
                      </span>
                      <span>
                        {team
                          .slice(0, MAX_TEAM_SHOWN)
                          .map(({ person }) => person.name)
                          .join(', ')}
                        {team.length > MAX_TEAM_SHOWN && (
                          <span className="text-muted-foreground">
                            {' '}
                            и ещё {team.length - MAX_TEAM_SHOWN}
                          </span>
                        )}
                      </span>
                    </Link>
                  )}
                </dd>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Отчёты и витрины</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Отчёты — по этому продукту, а не по активному: карточка
                  открыта на конкретной записи, и ссылка обязана вести к ней
                  же. Витрина маркетинга принимает сегмент, поэтому берётся
                  первый сегмент продукта; без сегментов — общий вход. */}
              <ul className="divide-y text-sm">
                <li className="flex flex-wrap items-baseline justify-between gap-2 py-1.5 first:pt-0">
                  <Link
                    href={`/reports/segments-jtbd?productId=${product.id}`}
                    className="font-medium hover:underline"
                  >
                    Матрица Сегменты × JTBD
                  </Link>
                  <span className="text-xs text-muted-foreground">покрытие задачами</span>
                </li>
                <li className="flex flex-wrap items-baseline justify-between gap-2 py-1.5">
                  <Link
                    href={`/reports/gaps?productId=${product.id}`}
                    className="font-medium hover:underline"
                  >
                    Пробелы
                  </Link>
                  <span className="text-xs text-muted-foreground">что делать дальше</span>
                </li>
                <li className="flex flex-wrap items-baseline justify-between gap-2 py-1.5">
                  <Link
                    href={
                      product.segments[0]
                        ? `/marketing-hub?segmentId=${product.segments[0].id}`
                        : '/marketing-hub'
                    }
                    className="font-medium hover:underline"
                  >
                    Маркетинг: что сказать сегменту
                  </Link>
                  <span className="text-xs text-muted-foreground">витрина для маркетинга</span>
                </li>
                <li className="flex flex-wrap items-baseline justify-between gap-2 py-1.5 last:pb-0">
                  <Link
                    href={`/sales-hub?productId=${product.id}`}
                    className="font-medium hover:underline"
                  >
                    Продажи
                  </Link>
                  <span className="text-xs text-muted-foreground">ресурсы и «есть ли фича X»</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-5">
        <SectionHeading
          title="Ресурсы"
          description="Sales-kit, документация, ссылки на Confluence/Jira"
        />
        <Card>
          <CardHeader className="flex flex-row items-baseline justify-between gap-2 space-y-0 pb-3">
            <CardTitle className="text-base font-semibold">
              Ресурсы{' '}
              <span className="font-normal text-muted-foreground">
                {product.productResources.length}
              </span>
            </CardTitle>
            <Link
              href={`/resources/new?productId=${product.id}`}
              aria-label="Добавить ресурс"
              title="Добавить ресурс"
              className={
                buttonVariants({ variant: 'outline', size: 'sm' }) + ' shrink-0 px-2.5 print:hidden'
              }
            >
              +
            </Link>
          </CardHeader>
          <CardContent>
            {product.productResources.length === 0 ? (
              <p className="text-sm text-muted-foreground">Пока нет ресурсов.</p>
            ) : (
              <ul className="divide-y text-sm">
                {product.productResources.map((resource) => (
                  <li
                    key={resource.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-1.5 first:pt-0"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Badge variant="outline" className="shrink-0">
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
                      <DeleteButton
                        action={deleteProductResource.bind(null, resource.id)}
                        impact={{ model: 'productResource', id: resource.id }}
                        name={resource.title}
                        appearance="icon"
                      />
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
