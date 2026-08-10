'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Product } from '@prisma/client'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { getDefaultProductId, setDefaultProductId } from '@/lib/client-storage'

const NEW_PRODUCT_SENTINEL = '__new__'

// Same "default product" pattern as PmProductSwitcher, pointed at
// /sales-hub instead of /pm. A second near-identical component rather than
// a shared one with a basePath prop — two consumers is still cheaper than
// the abstraction; see lib/roadmap.ts's comment for where this codebase
// draws that line (third consumer).
export function SalesProductSwitcher({
  products,
  selectedProductId,
}: {
  products: Pick<Product, 'id' | 'name'>[]
  selectedProductId?: string
}) {
  const router = useRouter()

  useEffect(() => {
    if (selectedProductId) return
    const stored = getDefaultProductId()
    if (stored && products.some((p) => p.id === stored)) {
      router.replace(`/sales-hub?productId=${stored}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleChange(productId: string) {
    if (productId === NEW_PRODUCT_SENTINEL) {
      router.push('/products/new')
      return
    }
    setDefaultProductId(productId)
    router.push(`/sales-hub?productId=${productId}`)
  }

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="sales-product-switcher" className="shrink-0 text-sm text-muted-foreground">
        Продукт
      </Label>
      <Select
        id="sales-product-switcher"
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
