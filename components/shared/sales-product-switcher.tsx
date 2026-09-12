'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Product } from '@prisma/client'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { setDefaultProductId } from '@/lib/client-storage'
import { switchActiveProduct } from '@/lib/actions/product-context'

const NEW_PRODUCT_SENTINEL = '__new__'

// Same "default product" pattern as PmProductSwitcher, pointed at
// /sales-hub instead of /pm. A second near-identical component rather than
// a shared one with a basePath prop — two consumers is still cheaper than
// the abstraction; see lib/roadmap.ts's comment for where this codebase
// draws that line (third consumer).
//
// Фаза 13: как и у PmProductSwitcher, восстановление из localStorage убрано —
// значение по умолчанию приходит с сервера из cookie активного продукта, а
// выбор здесь этот же cookie и пишет. Переход делает серверное действие: push
// на тот же маршрут с другим `productId` отдавал кэш прежнего продукта, потому
// что Router Cache не смотрит на строку запроса.
export function SalesProductSwitcher({
  products,
  selectedProductId,
}: {
  products: Pick<Product, 'id' | 'name'>[]
  selectedProductId?: string
}) {
  const router = useRouter()
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
      <input type="hidden" name="redirectTo" value="/sales-hub" />
      <Label htmlFor="sales-product-switcher" className="shrink-0 text-sm text-muted-foreground">
        Продукт
      </Label>
      <Select
        id="sales-product-switcher"
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
