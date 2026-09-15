'use client'

import { usePathname } from 'next/navigation'
import { useRef } from 'react'
import { Select } from '@/components/ui/select'
import { Tooltip } from '@/components/ui/tooltip'
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

  // Ноль продуктов — показывать нечего.
  if (products.length === 0) return null

  // Один продукт — переключать не из чего, но назвать его надо (фаза 13).
  // Раньше здесь был `return null`, и на весь интерфейс не оставалось ни
  // одного места, где написано, над каким продуктом человек работает: списки
  // уже отфильтрованы по активному продукту, а чем именно — догадайся сам.
  // Контрол не нужен, подпись нужна.
  if (products.length === 1) {
    return (
      <span className="hidden min-w-0 items-center gap-1.5 text-sm md:flex">
        <span className="text-muted-foreground">Продукт</span>
        <span className="min-w-0 truncate font-medium">{products[0].name}</span>
      </span>
    )
  }

  return (
    // Подсказка на форме, а не на триггере селекта: Select — составной
    // контрол, и обёртка вокруг его триггера меняла бы его собственную
    // разметку. Форма — ровно область переключателя (фаза 27 плана 2.4).
    <Tooltip
      side="bottom"
      content="Активный продукт: по нему отфильтрованы списки, дашборд и витрины"
    >
      <form ref={formRef} action={switchActiveProduct} className="min-w-0">
        <input type="hidden" name="redirectTo" value={pathname} />
        <label htmlFor="active-product" className="sr-only">
          Активный продукт
        </label>
        {/* Имя поля НЕ `productId`: так называется поле выбора продукта в
          формах создания, и два контрола с одним именем на странице — это
          столкновение. Оно уже стрельнуло: спек читал
          `select[name="productId"]`, находил зеркало переключателя в шапке
          вместо поля формы и видел валидное значение там, где проверял
          пустое. Переключатель ставит активный продукт, а не подаёт продукт в
          форму — разные вещи, разные имена. */}
        <Select
          id="active-product"
          name="activeProductId"
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
    </Tooltip>
  )
}
