import Link from 'next/link'
import type { ReactNode } from 'react'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DeleteButton } from '@/components/shared/delete-button'
import { PinButton } from '@/components/shared/pin-button'
import { CopyLinkButton } from '@/components/shared/copy-link-button'
import { RecentlyViewedTracker } from '@/components/shared/recently-viewed-tracker'
import { OtherProductNotice } from '@/components/shared/other-product-notice'
import { RecordBlockers } from '@/components/shared/record-blockers'
import type { Blocker } from '@/lib/record-blockers'
import type { OwnedModel } from '@/lib/ownership'

// Единый шаблон карточки записи (фаза 8 редизайна 2.1).
//
// До этого пять детальных страниц — сегмент, JTBD, фича, обещание, конкурент —
// повторяли одну и ту же вёрстку руками: пять кнопок в шапке в чуть разном
// порядке, пять вариантов «Пока нет …», у кого-то ссылка на продукт под
// заголовком, у кого-то в строке мета. Различия ничего не значили, но читались
// как значащие.
//
// **Слоты, а не поля.** Заголовок, мета и описание приходят готовыми узлами, а
// не строками, и это главное требование к шаблону: на всех этих страницах поля
// правятся кликом через `InlineEditableField`, страница обязана оставаться
// Server Component, а действие в неё передаётся как забинденный Server Action.
// Шаблон, который брал бы `title: string` и рисовал его сам, инлайн-правку
// убил бы — ровно то, о чём предупреждает план.
//
// Что шаблон рисует сам (и потому не может разъехаться): крошки, набор и
// порядок кнопок, рамка и отступы карточки, блок «Что мешает», заголовки
// секций со счётчиком и пустые состояния.

export interface RecordFact {
  label: string
  value: ReactNode
}

export function RecordPage({
  product,
  activeProductId,
  href,
  moduleHref,
  moduleLabel,
  plainTitle,
  kind,
  contextLink,
  titleAdornment,
  title,
  duplicateHref,
  editHref,
  pinned,
  togglePinned,
  deleteAction,
  deleteModel,
  recordId,
  ribbon,
  meta,
  facts,
  tags,
  description,
  blockers,
  children,
}: {
  product: { id: string; name: string }
  activeProductId: string | null
  /** Канонический адрес записи — для «недавно просмотренных» и возврата. */
  href: string
  moduleHref: string
  moduleLabel: string
  /** Нетронутый текст: он идёт в трекер и в диалог удаления, не в разметку. */
  plainTitle: string
  /** Как называется тип записи в трекере: «Сегмент», «Фича». */
  kind: string
  /**
   * Ссылка «откуда пришли», когда переход был не из списка: карточка JTBD,
   * открытая с графа, обязана уметь вернуть на граф — крошки ведут в список и
   * этого не заменяют.
   */
  contextLink?: ReactNode
  titleAdornment?: ReactNode
  title: ReactNode
  duplicateHref: string
  editHref: string
  pinned: boolean
  togglePinned: () => void
  deleteAction: () => void
  deleteModel: OwnedModel
  recordId: string
  ribbon?: ReactNode
  /** Строка чипов под заголовком: бейджи, ссылки на связанные записи. */
  meta?: ReactNode
  /** Ключевые поля-значения. Пустой массив — у модели их просто нет. */
  facts?: RecordFact[]
  tags?: ReactNode
  description?: ReactNode
  blockers: Blocker[]
  children?: ReactNode
}) {
  return (
    <main className="container max-w-2xl space-y-6 py-12">
      <OtherProductNotice activeProductId={activeProductId} product={product} redirectTo={href} />
      <RecentlyViewedTracker href={href} title={plainTitle} kind={kind} />

      <div>
        {/* Крошки, а не одинокая ссылка на продукт: до этого страница
            сообщала, какому продукту запись принадлежит, но не в каком разделе
            лежит — а с меню-цепочкой (фаза 6) раздел это и есть место. */}
        <nav aria-label="Хлебные крошки" className="mb-2 text-xs text-muted-foreground">
          <Link href={`/products/${product.id}`} className="hover:underline">
            {product.name}
          </Link>
          <span aria-hidden className="px-1.5">
            /
          </span>
          <Link href={moduleHref} className="hover:underline">
            {moduleLabel}
          </Link>
        </nav>

        {contextLink && <div className="mb-2">{contextLink}</div>}

        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {titleAdornment}
            <h1 className="text-2xl font-bold">{title}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <PinButton pinned={pinned} action={togglePinned} />
            <CopyLinkButton />
            <Link href={duplicateHref} className={buttonVariants({ variant: 'outline' })}>
              Дублировать
            </Link>
            <Link href={editHref} className={buttonVariants({ variant: 'outline' })}>
              Редактировать
            </Link>
            <DeleteButton
              action={deleteAction}
              impact={{ model: deleteModel, id: recordId }}
              name={plainTitle}
            />
          </div>
        </div>

        {ribbon && <div className="mb-4">{ribbon}</div>}
        {meta && <div className="mb-4 flex flex-wrap items-center gap-2">{meta}</div>}
        {tags && <div className="mb-4">{tags}</div>}
        {description && <div className="text-muted-foreground">{description}</div>}
        {facts && facts.length > 0 && (
          <dl className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="text-xs text-muted-foreground">{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <RecordBlockers blockers={blockers} />

      {children}
    </main>
  )
}

/**
 * Секция связанных записей.
 *
 * Раньше каждая страница писала свою: одинаковый `Card` с `border-l-4`, счётчик
 * в скобках у одних и без скобок у других, и пять разных «Пока нет …». Здесь
 * счётчик и пустое состояние рисуются одним способом, а копирайт пустого —
 * утверждение факта тем же голосом, что и «Что мешает» («Ни одной фичи не
 * привязано»), а не «Пока нет данных».
 */
export function RecordSection({
  id,
  title,
  count,
  action,
  empty,
  children,
}: {
  /** Якорь для кнопки из «Что мешает», если условие чинится на этой странице. */
  id?: string
  title: string
  count: number
  action?: ReactNode
  empty: ReactNode
  children: ReactNode
}) {
  return (
    <Card id={id} className="scroll-mt-24">
      <CardHeader
        className={
          'border-l-4 border-primary' +
          (action ? ' flex flex-row items-center justify-between gap-2 space-y-0' : '')
        }
      >
        <CardTitle className="text-base font-semibold">
          {title} <span className="font-normal text-muted-foreground">({count})</span>
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent>
        {count === 0 ? <div className="text-sm text-muted-foreground">{empty}</div> : children}
      </CardContent>
    </Card>
  )
}
