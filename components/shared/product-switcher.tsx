'use client'

import { usePathname } from 'next/navigation'
import { useRef } from 'react'
import { Select } from '@/components/ui/select'
import { switchActiveProduct } from '@/lib/actions/product-context'
import type { ActiveProduct } from '@/lib/product-context.server'

// Переключатель активного продукта в шапке (фаза 5 редизайна 2.1).
//
// Без него фильтрация была бы ловушкой: списки вдруг показывают меньше, а
// сменить контекст нечем. Поэтому переключатель появился в той же фазе, что и
// сам фильтр, а не «потом, в навигации».
//
// Обычная форма с Server Action, а не запись cookie с клиента: смену продукта
// должен увидеть сервер и перерисовать списки. `requestSubmit` на изменение
// селекта — чтобы не было отдельной кнопки «Применить»: выбор продукта это и
// есть подтверждение.
export function ProductSwitcher({
  products,
  activeProductId,
}: {
  products: ActiveProduct[]
  activeProductId: string | null
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const pathname = usePathname()

  // Один продукт — переключать не из чего, а лишний контрол в шапке только
  // отнимает место. Ноль — тем более.
  if (products.length < 2) return null

  return (
    <form ref={formRef} action={switchActiveProduct} className="min-w-0">
      <input type="hidden" name="redirectTo" value={pathname} />
      <label htmlFor="active-product" className="sr-only">
        Активный продукт
      </label>
      <Select
        id="active-product"
        name="productId"
        value={activeProductId ?? ''}
        onChange={() => formRef.current?.requestSubmit()}
        className="h-8 w-[14rem] sm:w-[18rem]"
      >
        {products.map((product) => (
          <option key={product.id} value={product.id}>
            {product.name}
          </option>
        ))}
      </Select>
    </form>
  )
}
