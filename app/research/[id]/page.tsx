import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { getActiveProductId } from '@/lib/product-context.server'
import { OtherProductNotice } from '@/components/shared/other-product-notice'
import { RecordCrumbs } from '@/components/shared/record-crumbs'
import { deleteResearch, toggleResearchPinned, updateResearchField } from '@/lib/actions/research'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DeleteButton } from '@/components/shared/delete-button'
import { PinButton } from '@/components/shared/pin-button'
import { CopyLinkButton } from '@/components/shared/copy-link-button'
import { RecentlyViewedTracker } from '@/components/shared/recently-viewed-tracker'
import { Eyebrow } from '@/components/shared/eyebrow'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { QuickAddInsight } from '@/components/shared/quick-add-insight'
import { InlineEditableField } from '@/components/shared/inline-editable-field'
import { RecordSection } from '@/components/shared/record-page'
import { ResearchLinkPicker } from '@/components/research/link-picker'
import { hypothesisStatusLabels, statusLabels, typeLabels } from '@/lib/labels'
import { isStale } from '@/lib/utils'
import { recordTitle } from '@/lib/record-title'
import { hypothesisKeyPhrase, jtbdKeyPhrase } from '@/lib/key-phrase'

// Заголовок вкладки — имя записи (фаза 15). Один лёгкий запрос по нужному
// полю, см. lib/record-title.ts; отсутствующую запись обработает сама страница.
export async function generateMetadata({ params }: { params: { id: string } }) {
  return { title: await recordTitle('research', params.id, 'Исследование') }
}

export const dynamic = 'force-dynamic'

export default async function ResearchDetailPage({ params }: { params: { id: string } }) {
  const userId = getCurrentUserId()
  const research = await prisma.research.findFirst({
    where: { id: params.id, userId },
    include: {
      product: true,
      insights: true,
      // Что опирается на исследование (фаза 26 плана 2.4): задачи, гипотезы и
      // разговоры знали своё исследование, а карточка исследования — нет.
      jtbds: { orderBy: { createdAt: 'desc' } },
      hypotheses: { orderBy: { createdAt: 'desc' } },
      conversations: { orderBy: { date: 'desc' } },
    },
  })

  if (!research) notFound()

  const activeProductId = await getActiveProductId(getCurrentUserId())

  const [segments, jtbds, hypotheses] = await Promise.all([
    prisma.segment.findMany({
      where: { productId: research.productId, userId },
      orderBy: { name: 'asc' },
    }),
    prisma.jTBD.findMany({
      where: { productId: research.productId, userId },
      orderBy: { title: 'asc' },
    }),
    // Для пикеров в строках инсайтов (фаза 24 плана 2.4): после звонка каждый
    // инсайт привязывается к задаче и гипотезе здесь же, а не через его форму.
    prisma.hypothesis.findMany({
      where: { productId: research.productId, userId },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const deleteResearchWithId = deleteResearch.bind(null, research.id)
  const toggleResearchPinnedWithId = toggleResearchPinned.bind(null, research.id, !research.pinned)

  return (
    <main className="container py-12 max-w-2xl space-y-6">
      <OtherProductNotice
        activeProductId={activeProductId}
        product={research.product}
        redirectTo={`/research/${research.id}`}
      />
      <RecentlyViewedTracker
        href={`/research/${research.id}`}
        title={`#${research.number} ${research.title}`}
        kind="Исследование"
      />
      <RecordCrumbs
        items={[
          { href: `/products/${research.product.id}`, label: research.product.name },
          { href: '/research', label: 'Исследования' },
        ]}
      />
      <div>
        <Eyebrow number={research.number} label="Исследование" className="mb-1" />
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h1 className="text-2xl font-bold">
            <InlineEditableField
              value={research.title}
              action={updateResearchField.bind(null, research.id, 'title')}
            />
          </h1>
          <div className="flex flex-wrap gap-2">
            <PinButton pinned={research.pinned} action={toggleResearchPinnedWithId} />
            <CopyLinkButton />
            <Link
              href={`/research/new?productId=${research.product.id}&duplicateFrom=${research.id}`}
              className={buttonVariants({ variant: 'outline' })}
            >
              Дублировать
            </Link>
            <Link
              href={`/research/${research.id}/edit`}
              className={buttonVariants({ variant: 'outline' })}
            >
              Редактировать
            </Link>
            <DeleteButton
              action={deleteResearchWithId}
              impact={{ model: 'research', id: research.id }}
              name={research.title}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <InlineEditableField
            value={research.status}
            type="select"
            options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))}
            action={updateResearchField.bind(null, research.id, 'status')}
            display="badge"
            labels={statusLabels}
            badgeVariant={{ IN_PROGRESS: 'secondary', COMPLETED: 'default' }}
          />
          <InlineEditableField
            value={research.type}
            type="select"
            options={Object.entries(typeLabels).map(([value, label]) => ({ value, label }))}
            action={updateResearchField.bind(null, research.id, 'type')}
            display="badge"
            labels={typeLabels}
            badgeVariant="outline"
          />
          {isStale(research.updatedAt) && (
            <Badge variant="outline" className="text-muted-foreground">
              Давно не обновлялось
            </Badge>
          )}
          <Link
            href={`/products/${research.product.id}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            {research.product.name}
          </Link>
          <InlineEditableField
            value={research.date.toISOString().slice(0, 10)}
            type="date"
            action={updateResearchField.bind(null, research.id, 'date')}
            display="date"
            className="text-sm text-muted-foreground"
          />
        </div>
        <div className="mb-4">
          <InlineEditableField
            value={research.tags.join(', ')}
            action={updateResearchField.bind(null, research.id, 'tags')}
            placeholder="+ добавить теги"
            display="tags"
          />
        </div>
        <p className="text-muted-foreground">
          <InlineEditableField
            value={research.description ?? ''}
            type="textarea"
            action={updateResearchField.bind(null, research.id, 'description')}
          />
        </p>
      </div>

      {/* Что опирается на это исследование (фаза 26 плана 2.4, F6). Раньше
          связь ставилась только из формы каждой записи, и после исследования
          разобрать, какие задачи оно подтвердило, значило открыть их по одной.
          Пикер — тот же паттерн, что «Добавить доказательство»: выбрать
          существующую запись продукта или создать новую. Привязка задачи
          ставит и флаг «подтверждена» — см. lib/actions/research-links.ts. */}
      <RecordSection
        title="Задачи, подтверждённые этим исследованием"
        count={research.jtbds.length}
        action={
          <ResearchLinkPicker
            researchId={research.id}
            productId={research.productId}
            kind="jtbd"
            fullFormHref={`/jtbd/new?productId=${research.productId}&researchId=${research.id}&from=/research/${research.id}`}
          />
        }
        empty="Ни одна задача клиента пока не опирается на это исследование."
      >
        <ul className="space-y-2">
          {research.jtbds.map((jtbd) => (
            <li key={jtbd.id} className="flex flex-wrap items-center gap-2 text-sm">
              <Link href={`/jtbd/${jtbd.id}`} title={jtbd.title} className="hover:underline">
                {jtbdKeyPhrase(jtbd.title)}
              </Link>
              {!jtbd.confirmed && (
                <Badge variant="outline" className="text-muted-foreground">
                  не отмечена подтверждённой
                </Badge>
              )}
            </li>
          ))}
        </ul>
      </RecordSection>

      <RecordSection
        title="Гипотезы"
        count={research.hypotheses.length}
        action={
          <ResearchLinkPicker
            researchId={research.id}
            productId={research.productId}
            kind="hypothesis"
            fullFormHref={`/hypotheses/new?productId=${research.productId}&researchId=${research.id}&from=/research/${research.id}`}
          />
        }
        empty="Ни одна гипотеза пока не опирается на это исследование."
      >
        <ul className="space-y-2">
          {research.hypotheses.map((hypothesis) => (
            <li key={hypothesis.id} className="flex flex-wrap items-center gap-2 text-sm">
              <Link
                href={`/hypotheses/${hypothesis.id}`}
                title={hypothesis.statement}
                className="hover:underline"
              >
                {hypothesisKeyPhrase(hypothesis.statement)}
              </Link>
              <span className="text-xs text-muted-foreground">
                {hypothesisStatusLabels[hypothesis.status]}
              </span>
            </li>
          ))}
        </ul>
      </RecordSection>

      <RecordSection
        title="Разговоры"
        count={research.conversations.length}
        action={
          <ResearchLinkPicker
            researchId={research.id}
            productId={research.productId}
            kind="conversation"
            fullFormHref={`/conversations/new?productId=${research.productId}&researchId=${research.id}&from=/research/${research.id}`}
          />
        }
        empty="Ни один разговор пока не привязан к этому исследованию."
      >
        <ul className="space-y-2">
          {research.conversations.map((conversation) => (
            <li key={conversation.id} className="flex flex-wrap items-center gap-2 text-sm">
              <Link href={`/conversations/${conversation.id}`} className="hover:underline">
                {conversation.title}
              </Link>
              <span className="text-xs text-muted-foreground">
                {conversation.date.toLocaleDateString('ru-RU')}
              </span>
            </li>
          ))}
        </ul>
      </RecordSection>

      <Card>
        <CardHeader className="border-l-4 border-primary">
          <CardTitle className="text-base font-semibold">
            Инсайты{' '}
            <span className="font-normal text-muted-foreground">({research.insights.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <QuickAddInsight
            productId={research.productId}
            researchId={research.id}
            segments={segments}
            jtbds={jtbds}
            hypotheses={hypotheses}
            initialInsights={research.insights}
          />
        </CardContent>
      </Card>
    </main>
  )
}
