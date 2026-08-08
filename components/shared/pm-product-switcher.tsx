'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Product } from '@prisma/client'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { getDefaultProductId, setDefaultProductId } from '@/lib/client-storage'

// PM view is scoped to one product at a time (plans/platform-views-plan.md
// §3) — "у PM обычно 3–4 продукта". Reuses the same "default product"
// localStorage slot that form pickers already default to elsewhere in the
// app (lib/client-storage.ts) rather than a separate PM-only key: it's the
// same underlying idea, "which product am I working on right now."
export function PmProductSwitcher({
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
      router.replace(`/pm?productId=${stored}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleChange(productId: string) {
    setDefaultProductId(productId)
    router.push(`/pm?productId=${productId}`)
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
      </Select>
    </div>
  )
}
