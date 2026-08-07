import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SortControl } from '@/components/shared/sort-control'
import { CsvExportButton } from '@/components/shared/csv-export-button'
import { SectionHeading } from '@/components/shared/section-heading'
import { stageLabels } from '@/lib/labels'
import { moduleByHref } from '@/lib/module-meta'

export const dynamic = 'force-dynamic'

const SORT_OPTIONS = [
  { value: 'created_desc', label: 'Сначала новые' },
  { value: 'name_asc', label: 'По названию' },
]

export default async function ProductsPage({ searchParams }: { searchParams: { sort?: string } }) {
  const sort = SORT_OPTIONS.some((o) => o.value === searchParams.sort)
    ? (searchParams.sort as string)
    : 'created_desc'

  const products = await prisma.product.findMany({
    where: { userId: getCurrentUserId() },
    orderBy: sort === 'name_asc' ? { name: 'asc' } : { createdAt: 'desc' },
  })

  return (
    <main className="container py-12">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <SectionHeading title="Продукты" description={moduleByHref['/products'].description} />
        <Link href="/products/new" className={buttonVariants()}>
          Новый продукт
        </Link>
      </div>

      {products.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
          <form method="get">
            <SortControl current={sort} options={SORT_OPTIONS} label="Сортировка" />
          </form>
          <CsvExportButton
            filename="products.csv"
            rows={products.map((p) => ({
              name: p.name,
              slug: p.slug,
              stage: stageLabels[p.stage],
            }))}
          />
        </div>
      )}

      {products.length === 0 ? (
        <p className="text-muted-foreground">Продуктов пока нет. Создайте первый продукт.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Link key={product.id} href={`/products/${product.id}`}>
              <Card className="h-full hover:border-primary transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{product.name}</CardTitle>
                    <Badge variant="secondary">{stageLabels[product.stage]}</Badge>
                  </div>
                  <CardDescription>{product.slug}</CardDescription>
                </CardHeader>
                {product.description && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {product.description}
                    </p>
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
