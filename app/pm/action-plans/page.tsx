import Link from 'next/link'
import { ClipboardList } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { loadPmContext } from '@/lib/pm-context'
import { deleteActionPlan, toggleActionPlanPinned } from '@/lib/actions/action-plans'
import { buttonVariants } from '@/components/ui/button'
import { DeleteButton } from '@/components/shared/delete-button'
import { PinButton } from '@/components/shared/pin-button'
import { TagBadges } from '@/components/shared/tag-badges'
import { DashboardWidgetCard } from '@/components/shared/dashboard-widget-card'
import { AddActionPlanForm } from '@/components/shared/add-action-plan-form'
import { EmptyState } from '@/components/shared/empty-state'
import { PmShell } from '@/components/pm/pm-shell'

export const dynamic = 'force-dynamic'

export default async function PmActionPlansPage({
  searchParams,
}: {
  searchParams: { productId?: string }
}) {
  const context = await loadPmContext(searchParams.productId)
  const { product, people, userId } = context

  const actionPlans = product
    ? await prisma.actionPlan.findMany({
        where: { productId: product.id, userId },
        orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
        include: { owner: true, processStep: true },
      })
    : []

  return (
    <PmShell context={context}>
      {product && (
        <DashboardWidgetCard
          id="action-plans"
          icon={ClipboardList}
          title="Экшн-планы"
          description="Заранее написанное «что делать» для предсказуемых нештатных ситуаций — открыть готовый план быстрее, чем придумывать реакцию в моменте"
          contentClassName="p-0"
          action={<AddActionPlanForm productId={product.id} people={people} />}
        >
          {actionPlans.length === 0 ? (
            <div className="p-5">
              <EmptyState moduleKey="/pm/action-plans" productId={product.id} variant="inline" />
            </div>
          ) : (
            <ul className="divide-y">
              {actionPlans.map((plan) => (
                <li key={plan.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <div className="min-w-0">
                      <p className="font-medium">{plan.scenario}</p>
                      {plan.trigger && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          Триггер: {plan.trigger}
                        </p>
                      )}
                      {plan.steps.length > 0 && (
                        <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-sm">
                          {plan.steps.map((step, i) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ol>
                      )}
                      <p className="mt-2 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                        {plan.owner && <span>Координирует: {plan.owner.name}</span>}
                        {plan.processStep && <span>Шаг процесса: {plan.processStep.title}</span>}
                      </p>
                      {plan.tags.length > 0 && (
                        <div className="mt-2">
                          <TagBadges tags={plan.tags} />
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <PinButton
                        pinned={plan.pinned}
                        action={toggleActionPlanPinned.bind(null, plan.id, !plan.pinned)}
                      />
                      <Link
                        href={`/pm/action-plans/${plan.id}/edit`}
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                      >
                        Редактировать
                      </Link>
                      <DeleteButton
                        action={deleteActionPlan.bind(null, plan.id)}
                        impact={{ model: 'actionPlan', id: plan.id }}
                        name={plan.scenario}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DashboardWidgetCard>
      )}
    </PmShell>
  )
}
