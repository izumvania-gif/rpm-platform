import type { JtbdJobType } from '@prisma/client'
import { jtbdJobTypeColors, jtbdJobTypeLabels } from '@/lib/jtbd-job-types'

// Small signal-colored dot for indirect JTBD references (a hypothesis/insight/feature
// linking to its JTBD) — full context without repeating <JobTypeBadge>'s pill everywhere.
export function JobTypeDot({ jobType }: { jobType: JtbdJobType }) {
  const colors = jtbdJobTypeColors[jobType]
  return (
    <span
      aria-hidden
      title={jtbdJobTypeLabels[jobType]}
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: colors.border }}
    />
  )
}
