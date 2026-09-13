import Link from 'next/link'
import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { InlineEditableField } from '@/components/shared/inline-editable-field'
import { PmProductSwitcher } from '@/components/shared/pm-product-switcher'
import { PmTabs } from '@/components/pm/pm-tabs'
import { updateProductField } from '@/lib/actions/products'
import { stageLabels } from '@/lib/labels'
import type { PmContext } from '@/lib/pm-context'

// Общая обёртка вкладок «Доставки» (фаза 9 редизайна 2.1).
//
// Заголовок, переключатель продукта, карточка продукта и полоса вкладок — всё,
// что обязано выглядеть одинаково на всех пяти маршрутах. Данные вкладка грузит
// сама и передаёт готовую разметку в `children`.
export function PmShell({ context, children }: { context: PmContext; children: ReactNode }) {
  const { products, product, people, selectedProductId, requestedProductMissing } = context

  return (
    <main className="container space-y-6 py-12">
      <div>
        <h1 className="mb-2 text-2xl font-bold">Доставка</h1>
        <p className="text-muted-foreground">
          Хаб на один продукт за раз: роадмап, процессы, экшн-планы и команда.
        </p>
      </div>

      {/* Вкладки — карта раздела, и её нельзя прятать за данными (фаза 14).
          Раньше они рендерились только при выбранном продукте, и на пустой
          базе все шесть маршрутов «Доставки» выглядели как одна и та же
          пустая страница: человек не мог даже узнать, из чего раздел состоит.
          Без продукта ссылки ведут на голые пути — те сами берут активный
          продукт из cookie, когда он появится. */}
      <PmTabs productId={product?.id} />

      {/* Ссылка вела на продукт, которого нет (удалён или чужой id). Молча
          показать другой — значит выдать его за тот, что просили (фаза 20). */}
      {requestedProductMissing && (
        <p className="rounded-md border border-[hsl(var(--signal-amber-border))] bg-[hsl(var(--signal-amber-bg))] px-3 py-2 text-sm text-[hsl(var(--signal-amber-text))]">
          Продукта из ссылки больше нет — показан {product ? `«${product.name}»` : 'выбор продукта'}
          .
        </p>
      )}

      {products.length === 0 ? (
        <Card variant="content" className="border-l-4 border-primary">
          <CardContent className="py-5">
            <p className="text-sm text-muted-foreground">
              Сначала создайте продукт —{' '}
              <Link href="/products/new" className="underline">
                новый продукт
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <PmProductSwitcher products={products} selectedProductId={selectedProductId} />

          {!product ? (
            <p className="text-sm text-muted-foreground">
              Выберите продукт выше, чтобы увидеть его роадмап.
            </p>
          ) : (
            <>
              {/* Одна строка, а не вторая карточка продукта (фаза 21 аудита
                  2.3): здесь человек пришёл за роадмапом, а не за описанием и
                  департаментом — те живут на полной карточке, куда ведёт
                  ссылка справа. Название, стадия и ответственный остались
                  редактируемыми: это то, что на «Доставке» правят по ходу. */}
              <Card variant="content">
                <CardContent className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                    <h2 className="text-lg font-bold">
                      <InlineEditableField
                        value={product.name}
                        action={updateProductField.bind(null, product.id, 'name')}
                      />
                    </h2>
                    <InlineEditableField
                      value={product.stage}
                      type="select"
                      options={Object.entries(stageLabels).map(([value, label]) => ({
                        value,
                        label,
                      }))}
                      action={updateProductField.bind(null, product.id, 'stage')}
                      display="badge"
                      labels={stageLabels}
                    />
                    <span className="text-sm text-muted-foreground">
                      Ответственный:{' '}
                      <InlineEditableField
                        value={product.ownerId ?? ''}
                        type="select"
                        options={[
                          { value: '', label: 'Не указан' },
                          ...people.map((p) => ({ value: p.id, label: p.name })),
                        ]}
                        labels={Object.fromEntries(people.map((p) => [p.id, p.name]))}
                        placeholder="+ назначить"
                        action={updateProductField.bind(null, product.id, 'ownerId')}
                      />
                    </span>
                  </div>
                  <Link
                    href={`/products/${product.id}`}
                    className="shrink-0 text-sm text-muted-foreground hover:underline"
                  >
                    Открыть карточку продукта →
                  </Link>
                </CardContent>
              </Card>

              {children}
            </>
          )}
        </>
      )}
    </main>
  )
}
