import { createDepartment } from '@/lib/actions/departments'
import { DepartmentForm } from '@/components/forms/department-form'

export const dynamic = 'force-dynamic'

export default function NewDepartmentPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="container py-12">
      <h1 className="text-2xl font-bold mb-8">Новый департамент</h1>
      <DepartmentForm action={createDepartment} error={searchParams.error} submitLabel="Создать" />
    </main>
  )
}
