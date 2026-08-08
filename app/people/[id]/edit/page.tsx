import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { updatePerson } from '@/lib/actions/people'
import { PersonForm } from '@/components/forms/person-form'

export const dynamic = 'force-dynamic'

export default async function EditPersonPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { error?: string }
}) {
  const person = await prisma.person.findFirst({
    where: { id: params.id, userId: getCurrentUserId() },
  })

  if (!person) notFound()

  const updatePersonWithId = updatePerson.bind(null, person.id)

  return (
    <main className="container py-12">
      <h1 className="text-2xl font-bold mb-8">Редактировать</h1>
      <PersonForm
        action={updatePersonWithId}
        defaultValues={person}
        error={searchParams.error}
        submitLabel="Сохранить"
      />
    </main>
  )
}
