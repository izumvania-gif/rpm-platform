import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { pluralizeRu } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { SectionHeading } from '@/components/shared/section-heading'
import { EmptyState } from '@/components/shared/empty-state'

export const dynamic = 'force-dynamic'

const PRODUCT_FORMS: [string, string, string] = ['продукт', 'продукта', 'продуктов']

export default async function DepartmentsPage() {
  const departments = await prisma.department.findMany({
    where: { userId: getCurrentUserId() },
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  })

  return (
    <main className="container py-12">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <SectionHeading
          level={1}
          title="Департаменты"
          description="Стратегическая группировка продуктов для CPO — например MFA-продукты, Электронная подпись, IoT-безопасность"
        />
        <Link href="/departments/new?from=/departments" className={buttonVariants()}>
          Новый департамент
        </Link>
      </div>

      {departments.length === 0 ? (
        <EmptyState moduleKey="/departments" />
      ) : (
        <ul className="divide-y rounded-md border">
          {departments.map((department) => (
            <li key={department.id}>
              <Link
                href={`/departments/${department.id}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm hover:bg-accent/50"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: department.color }}
                />
                <span className="min-w-0 shrink-0 font-medium">{department.name}</span>
                {department.description && (
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    {department.description}
                  </span>
                )}
                <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground">
                  {pluralizeRu(department._count.products, PRODUCT_FORMS)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
