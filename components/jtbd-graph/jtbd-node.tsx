'use client'

import type { JtbdJobType } from '@prisma/client'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { jtbdJobTypeColors, jtbdJobTypeLabels } from '@/lib/jtbd-job-types'

export interface JtbdNodeData {
  title: string
  category: string
  confirmed: boolean
  jobType: JtbdJobType
  [key: string]: unknown
}

export function JtbdNode({ data, selected }: NodeProps) {
  const { title, category, confirmed, jobType } = data as JtbdNodeData
  const colors = jtbdJobTypeColors[jobType]

  return (
    <div
      className="w-56 rounded-md border-2 bg-background p-3 shadow-sm"
      style={{
        borderColor: selected ? 'hsl(var(--primary))' : colors.border,
        backgroundColor: colors.bg,
      }}
    >
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground" />
      <div className="mb-1 flex items-center justify-between gap-1">
        <span
          className="truncate rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: colors.text }}
          title={jtbdJobTypeLabels[jobType]}
        >
          {jtbdJobTypeLabels[jobType]}
        </span>
        {confirmed && <span className="shrink-0 text-xs text-emerald-600">✓</span>}
      </div>
      <p className="line-clamp-3 text-sm" style={{ color: colors.text }}>
        {title}
      </p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{category}</p>
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />
    </div>
  )
}
