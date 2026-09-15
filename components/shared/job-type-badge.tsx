import type { JtbdJobType } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { jtbdJobTypeDescriptions, jtbdJobTypeLabels, jtbdJobTypeTone } from '@/lib/jtbd-job-types'

// Бейдж масштаба задачи объясняет свой тип подсказкой (фаза 27 плана 2.4) —
// тем же определением, что показывает форма под селектом. Обёртка-span с
// tabIndex: Badge не пробрасывает ref, а подсказка должна открываться и с
// клавиатуры.
export function JobTypeBadge({ jobType }: { jobType: JtbdJobType }) {
  return (
    <Tooltip content={jtbdJobTypeDescriptions[jobType]}>
      <span tabIndex={0} className="inline-flex rounded-full">
        <Badge variant={jtbdJobTypeTone[jobType]}>{jtbdJobTypeLabels[jobType]}</Badge>
      </span>
    </Tooltip>
  )
}
