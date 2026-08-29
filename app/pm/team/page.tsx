import Link from 'next/link'
import { Users2 } from 'lucide-react'
import { loadPmContext } from '@/lib/pm-context'
import { removeProductTeamMember } from '@/lib/actions/product-team'
import { getProductTeam } from '@/lib/team-workload'
import { DeleteButton } from '@/components/shared/delete-button'
import { PersonAvatar } from '@/components/shared/person-avatar'
import { DashboardWidgetCard } from '@/components/shared/dashboard-widget-card'
import { AddTeamMemberForm } from '@/components/shared/add-team-member-form'
import { EmptyState } from '@/components/shared/empty-state'
import { PmShell } from '@/components/pm/pm-shell'

export const dynamic = 'force-dynamic'

export default async function PmTeamPage({
  searchParams,
}: {
  searchParams: { productId?: string }
}) {
  const context = await loadPmContext(searchParams.productId)
  const { product, people, userId } = context

  const team = product ? await getProductTeam(userId, product.id) : []

  return (
    <PmShell context={context}>
      {product && (
        <DashboardWidgetCard
          id="team"
          icon={Users2}
          title="Команда"
          description="Кто в команде этого продукта — явно добавленные плюс те, у кого уже есть дела по роадмапу или процессу"
          contentClassName="p-0"
          action={
            <AddTeamMemberForm
              productId={product.id}
              people={people}
              existingPersonIds={team.map((t) => t.person.id)}
            />
          }
        >
          {team.length === 0 ? (
            <div className="p-5">
              <EmptyState moduleKey="/pm/team" variant="inline" icon={Users2} />
            </div>
          ) : (
            <ul className="divide-y">
              {team.map(({ person, activeCount, totalCount, inRoster, membershipId }) => (
                <li
                  key={person.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm"
                >
                  <PersonAvatar name={person.name} avatarUrl={person.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/people/${person.id}`} className="font-medium hover:underline">
                      {person.name}
                    </Link>
                    {person.role && (
                      <span className="ml-2 text-muted-foreground">{person.role}</span>
                    )}
                  </div>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {activeCount} активных · {totalCount} всего
                  </span>
                  {inRoster && membershipId && (
                    <DeleteButton
                      action={removeProductTeamMember.bind(null, membershipId)}
                      confirmMessage="Убрать из команды продукта?"
                      impact={{ model: 'productTeamMember', id: membershipId }}
                      name={person.name}
                      label="Убрать"
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </DashboardWidgetCard>
      )}
    </PmShell>
  )
}
