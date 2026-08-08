'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { User } from 'lucide-react'

export interface ProcessStepNodeData {
  title: string
  assignedPersonName: string | null
  [key: string]: unknown
}

// Same three-zone shape as JtbdNode (components/jtbd-graph/jtbd-node.tsx)
// — title as the main content, a hairline-separated footer row — but with
// the app's primary accent instead of a signal tone, since process steps
// don't carry a type taxonomy the way JTBD job types do.
export function ProcessStepNode({ data, selected }: NodeProps) {
  const { title, assignedPersonName } = data as ProcessStepNodeData

  return (
    <div
      className="relative w-56 rounded-md border bg-card py-2.5 pl-3 pr-2.5 shadow-sm"
      style={{
        borderLeft: '4px solid hsl(var(--primary))',
        boxShadow: selected ? '0 0 0 1.5px hsl(var(--primary))' : undefined,
      }}
    >
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground" />
      <p className="line-clamp-2 pr-1 text-[13.5px] font-medium leading-snug">{title}</p>
      {assignedPersonName && (
        <div className="mt-2 flex items-center gap-1 border-t pt-1.5">
          <User size={11} strokeWidth={1.75} className="shrink-0 text-muted-foreground" />
          <p className="truncate text-[11px] text-muted-foreground">{assignedPersonName}</p>
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />
    </div>
  )
}
