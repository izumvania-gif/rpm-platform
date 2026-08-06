import { createProduct } from '@/lib/actions/products'
import { ProductForm } from '@/components/forms/product-form'

export default function NewProductPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="container py-12">
      <h1 className="text-2xl font-bold mb-8">Новый продукт</h1>
      <ProductForm action={createProduct} error={searchParams.error} submitLabel="Создать" />
    </main>
  )
}
