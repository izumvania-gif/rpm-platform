import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { updateDepartment } from '@/lib/actions/departments'
import { DepartmentForm } from '@/components/forms/department-form'

export const dynamic = 'force-dynamic'

export default async function EditDepartmentPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { error?: string }
}) {
  const department = await prisma.department.findFirst({
    where: { id: params.id, userId: getCurrentUserId() },
  })

  if (!department) notFound()

  const updateDepartmentWithId = updateDepartment.bind(null, department.id)

  return (
    <main className="container py-12">
      <h1 className="text-2xl font-bold mb-8">Редактировать</h1>
      <DepartmentForm
        action={updateDepartmentWithId}
        defaultValues={department}
        error={searchParams.error}
        submitLabel="Сохранить"
      />
    </main>
  )
}
