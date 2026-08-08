import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { deletePerson, togglePersonPinned, updatePersonField } from '@/lib/actions/people'
import { buttonVariants } from '@/components/ui/button'
import { DeleteButton } from '@/components/shared/delete-button'
import { PinButton } from '@/components/shared/pin-button'
import { CopyLinkButton } from '@/components/shared/copy-link-button'
import { InlineEditableField } from '@/components/shared/inline-editable-field'

export const dynamic = 'force-dynamic'

export default async function PersonDetailPage({ params }: { params: { id: string } }) {
  const person = await prisma.person.findFirst({
    where: { id: params.id, userId: getCurrentUserId() },
    include: { ownedProducts: { orderBy: { name: 'asc' } } },
  })

  if (!person) notFound()

  const deletePersonWithId = deletePerson.bind(null, person.id)
  const togglePersonPinnedWithId = togglePersonPinned.bind(null, person.id, !person.pinned)

  return (
    <main className="container py-12 max-w-2xl space-y-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h1 className="text-2xl font-bold">
            <InlineEditableField
              value={person.name}
              action={updatePersonField.bind(null, person.id, 'name')}
            />
          </h1>
          <div className="flex flex-wrap gap-2">
            <PinButton pinned={person.pinned} action={togglePersonPinnedWithId} />
            <CopyLinkButton />
            <Link href={`/people/${person.id}/edit`} className={buttonVariants({ variant: 'outline' })}>
              Редактировать
            </Link>
            <DeleteButton action={deletePersonWithId} />
          </div>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <InlineEditableField
            value={person.role ?? ''}
            placeholder="+ добавить роль"
            action={updatePersonField.bind(null, person.id, 'role')}
          />
          <InlineEditableField
            value={person.team ?? ''}
            placeholder="+ добавить команду"
            action={updatePersonField.bind(null, person.id, 'team')}
          />
        </div>
        <div className="mb-4">
          <InlineEditableField
            value={person.skills.join(', ')}
            action={updatePersonField.bind(null, person.id, 'skills')}
            placeholder="+ добавить навыки"
            display="tags"
          />
        </div>
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Email</dt>
            <dd>
              <InlineEditableField
                value={person.email ?? ''}
                action={updatePersonField.bind(null, person.id, 'email')}
              />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Аватар (ссылка)</dt>
            <dd>
              <InlineEditableField
                value={person.avatarUrl ?? ''}
                action={updatePersonField.bind(null, person.id, 'avatarUrl')}
                display="link"
              />
            </dd>
          </div>
        </dl>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
          Ответственный за продукты ({person.ownedProducts.length})
        </h2>
        {person.ownedProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Пока не назначен ответственным ни за один продукт.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {person.ownedProducts.map((product) => (
              <li key={product.id}>
                <Link
                  href={`/products/${product.id}`}
                  className="block px-4 py-3 text-sm hover:bg-accent/50"
                >
                  {product.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
