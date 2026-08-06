import type { JtbdJobType } from '@prisma/client'
import { jtbdJobTypeColors, jtbdJobTypeLabels } from '@/lib/jtbd-job-types'

export function JobTypeBadge({ jobType }: { jobType: JtbdJobType }) {
  const colors = jtbdJobTypeColors[jobType]
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }}
    >
      {jtbdJobTypeLabels[jobType]}
    </span>
  )
}
