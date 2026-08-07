import type { JtbdJobType } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { jtbdJobTypeLabels, jtbdJobTypeTone } from '@/lib/jtbd-job-types'

export function JobTypeBadge({ jobType }: { jobType: JtbdJobType }) {
  return <Badge variant={jtbdJobTypeTone[jobType]}>{jtbdJobTypeLabels[jobType]}</Badge>
}
