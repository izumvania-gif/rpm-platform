import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { deleteDepartment, updateDepartmentField } from '@/lib/actions/departments'
import { stageLabels } from '@/lib/labels'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { DeleteButton } from '@/components/shared/delete-button'
import { CopyLinkButton } from '@/components/shared/copy-link-button'
import { InlineEditableField } from '@/components/shared/inline-editable-field'

export const dynamic = 'force-dynamic'

export default async function DepartmentDetailPage({ params }: { params: { id: string } }) {
  const department = await prisma.department.findFirst({
    where: { id: params.id, userId: getCurrentUserId() },
    include: { products: { orderBy: { name: 'asc' } } },
  })

  if (!department) notFound()

  const deleteDepartmentWithId = deleteDepartment.bind(null, department.id)

  return (
    <main className="container py-12 max-w-2xl space-y-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-3">
            <span
              className="h-4 w-4 shrink-0 rounded-full"
              style={{ backgroundColor: department.color }}
            />
            <h1 className="text-2xl font-bold">
              <InlineEditableField
                value={department.name}
                action={updateDepartmentField.bind(null, department.id, 'name')}
              />
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <CopyLinkButton />
            <Link
              href={`/departments/${department.id}/edit`}
              className={buttonVariants({ variant: 'outline' })}
            >
              Редактировать
            </Link>
            <DeleteButton
              action={deleteDepartmentWithId}
              confirmMessage="Удалить департамент? Продукты останутся, но потеряют эту группировку."
            />
          </div>
        </div>
        <p className="text-muted-foreground">
          <InlineEditableField
            value={department.description ?? ''}
            type="textarea"
            placeholder="+ добавить описание"
            action={updateDepartmentField.bind(null, department.id, 'description')}
          />
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
          Продукты ({department.products.length})
        </h2>
        {department.products.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Пока ни один продукт не отнесён к этому департаменту.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {department.products.map((product) => (
              <li key={product.id}>
                <Link
                  href={`/products/${product.id}`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm hover:bg-accent/50"
                >
                  <span className="min-w-0 flex-1 font-medium">{product.name}</span>
                  <Badge variant="secondary">{stageLabels[product.stage]}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
