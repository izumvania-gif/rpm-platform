import { createPerson } from '@/lib/actions/people'
import { PersonForm } from '@/components/forms/person-form'

export const dynamic = 'force-dynamic'

export default function NewPersonPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <main className="container py-12">
      <h1 className="text-2xl font-bold mb-8">Новый человек</h1>
      <PersonForm action={createPerson} error={searchParams.error} submitLabel="Создать" />
    </main>
  )
}
