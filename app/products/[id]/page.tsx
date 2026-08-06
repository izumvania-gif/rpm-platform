import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { deleteProduct } from '@/lib/actions/products'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DeleteButton } from '@/components/shared/delete-button'
import { stageLabels } from '@/lib/labels'

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const product = await prisma.product.findFirst({
    where: { id: params.id, userId: getCurrentUserId() },
    include: {
      researches: { orderBy: { date: 'desc' } },
      segments: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!product) notFound()

  const deleteProductWithId = deleteProduct.bind(null, product.id)

  return (
    <main className="container py-12 space-y-10">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <div className="flex gap-2">
            <Link
              href={`/products/${product.id}/edit`}
              className={buttonVariants({ variant: 'outline' })}
            >
              Редактировать
            </Link>
            <DeleteButton
              action={deleteProductWithId}
              confirmMessage="Удалить продукт вместе со всеми исследованиями и сегментами?"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <Badge variant="secondary">{stageLabels[product.stage]}</Badge>
          <span className="text-sm text-muted-foreground">{product.slug}</span>
        </div>
        {product.description && (
          <p className="text-muted-foreground max-w-2xl">{product.description}</p>
        )}
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Исследования ({product.researches.length})</h2>
          <Link
            href={`/research/new?productId=${product.id}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Добавить исследование
          </Link>
        </div>
        {product.researches.length === 0 ? (
          <p className="text-sm text-muted-foreground">Пока нет исследований.</p>
        ) : (
          <ul className="space-y-2">
            {product.researches.map((r) => (
              <li key={r.id}>
                <Link href={`/research/${r.id}`} className="text-sm hover:underline">
                  #{r.number} {r.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Сегменты ({product.segments.length})</h2>
          <Link
            href={`/segments/new?productId=${product.id}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Добавить сегмент
          </Link>
        </div>
        {product.segments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Пока нет сегментов.</p>
        ) : (
          <ul className="space-y-2">
            {product.segments.map((s) => (
              <li key={s.id}>
                <Link href={`/segments/${s.id}`} className="text-sm hover:underline">
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
