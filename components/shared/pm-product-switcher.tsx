'use client'

import { useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { Product } from '@prisma/client'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { setDefaultProductId } from '@/lib/client-storage'
import { switchActiveProduct } from '@/lib/actions/product-context'

const NEW_PRODUCT_SENTINEL = '__new__'

// PM view is scoped to one product at a time (plans/platform-views-plan.md
// §3) — "у PM обычно 3–4 продукта".
//
// Фаза 13: восстановление выбора из localStorage отсюда убрано, а сам выбор
// теперь пишется в cookie активного продукта. Причина — «какой продукт я
// веду» хранилось в двух местах сразу: cookie, которым живут девятнадцать
// страниц цепочки, и localStorage, который знали только две витрины. Места
// расходились, и человек, переключивший продукт здесь, возвращался в цепочку
// к прежнему. Значение по умолчанию теперь приходит с сервера
// (`loadPmContext`), поэтому клиентское восстановление стало лишним.
//
// Переход делает серверное действие, а не `router.push`. Router Cache у Next
// ключуется по сегментам пути и не смотрит на строку запроса, поэтому push на
// тот же маршрут с другим `productId` отдавал кэш прежнего продукта: шапка и
// переключатель показывали новый, а карточка на странице — старый. `refresh`
// эту гонку не снимал. Серверный редирект рендерит страницу заново всегда.
//
// Заодно из адреса уходит `productId`: он теперь ловушка. Явный параметр
// главнее cookie, поэтому переключение на странице `?productId=A` иначе не
// давало бы никакого эффекта — адрес продолжал бы требовать A.
export function PmProductSwitcher({
  products,
  selectedProductId,
}: {
  products: Pick<Product, 'id' | 'name'>[]
  selectedProductId?: string
}) {
  const router = useRouter()
  // Смена продукта не должна уводить со вкладки, на которой человек стоит
  // (фаза 9): раньше и переключатель, и восстановление из localStorage вели
  // на жёстко зашитый `/pm`, потому что вкладка была одна.
  const pathname = usePathname()
  const formRef = useRef<HTMLFormElement>(null)

  function handleChange(productId: string) {
    if (productId === NEW_PRODUCT_SENTINEL) {
      router.push('/products/new')
      return
    }
    setDefaultProductId(productId)
    formRef.current?.requestSubmit()
  }

  return (
    <form ref={formRef} action={switchActiveProduct} className="flex items-center gap-2">
      <input type="hidden" name="redirectTo" value={pathname} />
      <Label htmlFor="pm-product-switcher" className="shrink-0 text-sm text-muted-foreground">
        Продукт
      </Label>
      <Select
        id="pm-product-switcher"
        name="activeProductId"
        value={selectedProductId ?? ''}
        onChange={(e) => handleChange(e.target.value)}
        className="h-9 w-auto min-w-[14rem]"
      >
        <option value="" disabled>
          Выберите продукт
        </option>
        {products.map((product) => (
          <option key={product.id} value={product.id}>
            {product.name}
          </option>
        ))}
        <option value={NEW_PRODUCT_SENTINEL}>+ Новый продукт</option>
      </Select>
    </form>
  )
}
