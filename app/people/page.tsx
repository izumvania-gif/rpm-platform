import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { buttonVariants } from '@/components/ui/button'
import { SectionHeading } from '@/components/shared/section-heading'
import { PinButton } from '@/components/shared/pin-button'
import { PersonAvatar } from '@/components/shared/person-avatar'
import { togglePersonPinned } from '@/lib/actions/people'
import { EmptyState } from '@/components/shared/empty-state'

export const dynamic = 'force-dynamic'

export default async function PeoplePage() {
  const people = await prisma.person.findMany({
    where: { userId: getCurrentUserId() },
    orderBy: { name: 'asc' },
  })

  return (
    <main className="container py-12">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <SectionHeading
          level={1}
          title="Люди"
          description="Справочник команды — кто чем занимается и за какие продукты отвечает"
        />
        <Link href="/people/new" className={buttonVariants()}>
          Новый человек
        </Link>
      </div>

      {people.length === 0 ? (
        <EmptyState moduleKey="/people" />
      ) : (
        <ul className="divide-y rounded-md border">
          {people.map((person) => (
            <li key={person.id}>
              <Link
                href={`/people/${person.id}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm hover:bg-accent/50"
              >
                <PersonAvatar name={person.name} avatarUrl={person.avatarUrl} size="sm" />
                <span className="min-w-0 shrink-0 font-medium">{person.name}</span>
                {person.role && (
                  <span className="min-w-0 shrink-0 text-muted-foreground">{person.role}</span>
                )}
                {person.team && (
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    {person.team}
                  </span>
                )}
                <PinButton
                  pinned={person.pinned}
                  action={togglePersonPinned.bind(null, person.id, !person.pinned)}
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
