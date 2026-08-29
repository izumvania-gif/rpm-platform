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
  const { products, product, people, departments, selectedProductId } = context

  return (
    <main className="container space-y-6 py-12">
      <div>
        <h1 className="mb-2 text-2xl font-bold">Доставка</h1>
        <p className="text-muted-foreground">
          Хаб на один продукт за раз: роадмап, процессы, экшн-планы и команда.
        </p>
      </div>

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
              <Card variant="content">
                <CardContent className="space-y-3 py-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-xl font-bold">
                      <InlineEditableField
                        value={product.name}
                        action={updateProductField.bind(null, product.id, 'name')}
                      />
                    </h2>
                    <Link
                      href={`/products/${product.id}`}
                      className="shrink-0 text-sm text-muted-foreground hover:underline"
                    >
                      Открыть карточку продукта →
                    </Link>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
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
                    <span className="text-sm text-muted-foreground">
                      Департамент:{' '}
                      <InlineEditableField
                        value={product.departmentId ?? ''}
                        type="select"
                        options={[
                          { value: '', label: 'Без департамента' },
                          ...departments.map((d) => ({ value: d.id, label: d.name })),
                        ]}
                        labels={Object.fromEntries(departments.map((d) => [d.id, d.name]))}
                        placeholder="+ назначить"
                        action={updateProductField.bind(null, product.id, 'departmentId')}
                      />
                    </span>
                  </div>
                  <p className="max-w-2xl text-sm text-muted-foreground">
                    <InlineEditableField
                      value={product.description ?? ''}
                      type="textarea"
                      placeholder="+ добавить описание"
                      action={updateProductField.bind(null, product.id, 'description')}
                    />
                  </p>
                </CardContent>
              </Card>

              <PmTabs productId={product.id} />

              {children}
            </>
          )}
        </>
      )}
    </main>
  )
}
