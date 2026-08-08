'use client'

import type { JtbdJobType } from '@prisma/client'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { CircleCheck } from 'lucide-react'
import { jtbdJobTypeColors, jtbdJobTypeIcon, jtbdJobTypeLabels } from '@/lib/jtbd-job-types'

export interface JtbdNodeData {
  title: string
  category: string
  confirmed: boolean
  jobType: JtbdJobType
  [key: string]: unknown
}

// Фаза 3 (plans/archive/visual-redesign-plan.md §4) — three clear zones instead of a
// wall of text: icon+type top-left, title as the main content, category as a
// mono tag below a hairline. Color is an accent (left border + icon), not a
// full fill, so it doesn't compete with the title for attention.
export function JtbdNode({ data, selected }: NodeProps) {
  const { title, category, confirmed, jobType } = data as JtbdNodeData
  const colors = jtbdJobTypeColors[jobType]
  const Icon = jtbdJobTypeIcon[jobType]

  return (
    <div
      className="relative w-64 rounded-md border bg-card py-2.5 pl-3 pr-2.5 shadow-sm"
      style={{
        borderLeft: `4px solid ${colors.border}`,
        boxShadow: selected ? '0 0 0 1.5px hsl(var(--primary))' : undefined,
      }}
    >
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground" />
      {confirmed && (
        <CircleCheck size={14} strokeWidth={2} className="absolute right-2 top-2 text-emerald-600">
          <title>Подтверждено исследованием</title>
        </CircleCheck>
      )}
      <div className="mb-1.5 flex items-center gap-1.5">
        <Icon size={14} strokeWidth={1.75} style={{ color: colors.border }}>
          <title>{jtbdJobTypeLabels[jobType]}</title>
        </Icon>
      </div>
      <p className="line-clamp-2 pr-4 text-[13.5px] font-medium leading-snug">{title}</p>
      <div className="mt-2 border-t pt-1.5">
        <p className="truncate font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          {category}
        </p>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />
    </div>
  )
}
