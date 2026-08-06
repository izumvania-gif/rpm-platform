'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'

export interface JtbdNodeData {
  title: string
  category: string
  confirmed: boolean
  [key: string]: unknown
}

export function JtbdNode({ data, selected }: NodeProps) {
  const { title, category, confirmed } = data as JtbdNodeData

  return (
    <div
      className={`w-56 rounded-md border bg-background p-3 shadow-sm ${
        selected ? 'border-primary' : 'border-input'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground" />
      <div className="mb-1 flex items-center justify-between gap-1">
        <span className="truncate text-xs text-muted-foreground">{category}</span>
        {confirmed && <span className="shrink-0 text-xs text-emerald-600">✓</span>}
      </div>
      <p className="line-clamp-3 text-sm">{title}</p>
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />
    </div>
  )
}
