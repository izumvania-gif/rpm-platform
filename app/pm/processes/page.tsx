import Link from 'next/link'
import { ArrowLeft, Workflow } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { loadPmContext } from '@/lib/pm-context'
import { deleteProcess } from '@/lib/actions/processes'
import { buttonVariants } from '@/components/ui/button'
import { DeleteButton } from '@/components/shared/delete-button'
import { DashboardWidgetCard } from '@/components/shared/dashboard-widget-card'
import { AddProcessForm } from '@/components/shared/add-process-form'
import { ProcessGraph } from '@/components/process-graph/canvas'
import { EmptyState } from '@/components/shared/empty-state'
import { PmShell } from '@/components/pm/pm-shell'
import { pluralizeRu } from '@/lib/plural'

const STEP_FORMS: [string, string, string] = ['шаг', 'шага', 'шагов']

export const dynamic = 'force-dynamic'

export default async function PmProcessesPage({
  searchParams,
}: {
  searchParams: { productId?: string; processId?: string }
}) {
  const context = await loadPmContext(searchParams.productId)
  const { product, people } = context

  const processes = product
    ? await prisma.process.findMany({
        where: { productId: product.id },
        orderBy: { createdAt: 'asc' },
        include: { _count: { select: { steps: true } } },
      })
    : []

  const selectedProcess =
    searchParams.processId && processes.some((p) => p.id === searchParams.processId)
      ? processes.find((p) => p.id === searchParams.processId)!
      : undefined

  const [processSteps, processEdges] = selectedProcess
    ? await Promise.all([
        prisma.processStep.findMany({
          where: { processId: selectedProcess.id },
          include: { assignedPerson: true },
        }),
        prisma.processEdge.findMany({ where: { fromStep: { processId: selectedProcess.id } } }),
      ])
    : [[], []]

  return (
    <PmShell context={context}>
      {product && (
        <DashboardWidgetCard
          id="process"
          icon={Workflow}
          title={selectedProcess ? `Процесс: ${selectedProcess.title}` : 'Процессы'}
          description={
            selectedProcess
              ? 'Кто что делает и кому передаёт дальше'
              : 'Продукт может описывать несколько процессов — выберите, чтобы увидеть схему'
          }
          action={
            selectedProcess ? (
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={`/pm/processes?productId=${product.id}`}
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  <ArrowLeft size={14} className="mr-1" />
                  Все процессы
                </Link>
                <Link
                  href={`/pm/processes/${selectedProcess.id}/edit`}
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  Переименовать
                </Link>
                <DeleteButton
                  action={deleteProcess.bind(null, selectedProcess.id)}
                  confirmMessage="Удалить процесс?"
                  impact={{ model: 'process', id: selectedProcess.id }}
                  name={selectedProcess.title}
                />
              </div>
            ) : (
              <AddProcessForm productId={product.id} />
            )
          }
        >
          {selectedProcess ? (
            <ProcessGraph
              processId={selectedProcess.id}
              steps={processSteps}
              processEdges={processEdges}
              people={people}
            />
          ) : processes.length === 0 ? (
            <EmptyState moduleKey="/pm/processes" productId={product.id} variant="inline" />
          ) : (
            <ul className="divide-y rounded-md border">
              {processes.map((process) => (
                <li key={process.id}>
                  <Link
                    href={`/pm/processes?productId=${product.id}&processId=${process.id}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm hover:bg-accent/50"
                  >
                    <span className="min-w-0 flex-1 font-medium">{process.title}</span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {pluralizeRu(process._count.steps, STEP_FORMS)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DashboardWidgetCard>
      )}
    </PmShell>
  )
}
