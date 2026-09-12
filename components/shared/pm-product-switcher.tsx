'use client'

import { usePathname, useRouter } from 'next/navigation'
import type { Product } from '@prisma/client'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { setDefaultProductId } from '@/lib/client-storage'
import { selectActiveProduct } from '@/lib/actions/product-context'

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

  function handleChange(productId: string) {
    if (productId === NEW_PRODUCT_SENTINEL) {
      router.push('/products/new')
      return
    }
    setDefaultProductId(productId)
    // Cookie пишем ДО перехода, а не параллельно с ним: иначе следующая
    // страница успевает отрендериться на старом значении, и выбор виден
    // только пока в адресе есть `productId`.
    void selectActiveProduct(productId).then(() => {
      router.push(`${pathname}?productId=${productId}`)
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="pm-product-switcher" className="shrink-0 text-sm text-muted-foreground">
        Продукт
      </Label>
      <Select
        id="pm-product-switcher"
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
    </div>
  )
}
