import { CalendarClock } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { loadPmContext } from '@/lib/pm-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AddRoadmapItemForm } from '@/components/shared/add-roadmap-item-form'
import { GanttChart } from '@/components/roadmap-gantt/gantt-chart'
import { PmShell } from '@/components/pm/pm-shell'
import { buildGanttLayout } from '@/lib/roadmap-gantt'

export const dynamic = 'force-dynamic'

// Тот же роадмап, другой вид. Отдельным маршрутом, а не параметром `?view=`:
// у вкладки в меню должен быть собственный адрес, иначе на неё нельзя ни
// сослаться, ни подсветить её.
export default async function PmGanttPage({
  searchParams,
}: {
  searchParams: { productId?: string }
}) {
  const context = await loadPmContext(searchParams.productId)
  const { product, people, userId } = context

  const roadmapItems = product
    ? await prisma.roadmapItem.findMany({
        where: { productId: product.id, userId },
        orderBy: [{ quarter: 'asc' }, { createdAt: 'asc' }],
        include: { owner: true, feature: true, jtbd: true },
      })
    : []

  return (
    <PmShell context={context}>
      {product && (
        <Card variant="content">
          <CardHeader className="flex flex-col items-start gap-2 space-y-0 border-l-4 border-primary sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-1.5 text-base">
              <CalendarClock size={15} strokeWidth={1.75} className="text-primary" />
              Гант
            </CardTitle>
            <AddRoadmapItemForm productId={product.id} people={people} />
          </CardHeader>
          <CardContent className="p-5">
            <GanttChart layout={buildGanttLayout(roadmapItems)} allowTrackChange />
          </CardContent>
        </Card>
      )}
    </PmShell>
  )
}
