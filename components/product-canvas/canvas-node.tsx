'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Compass, FlaskConical, Users } from 'lucide-react'
import { signalToneColors, type SignalTone } from '@/lib/signal-colors'
import { danglingReason, type CanvasKind } from '@/lib/product-canvas'

export interface ProductCanvasNodeData {
  kind: CanvasKind
  label: string
  fullLabel?: string
  meta?: string
  dangling?: boolean
  [key: string]: unknown
}

// One node component for all three kinds rather than three near-identical
// ones: they differ only in icon, tone and which handles they carry, and the
// chain reads better when the cards are visibly siblings.
const KIND_TONE: Record<CanvasKind, SignalTone> = {
  SEGMENT: 'blue',
  JTBD: 'violet',
  HYPOTHESIS: 'slate',
}
const KIND_ICON = { SEGMENT: Users, JTBD: Compass, HYPOTHESIS: FlaskConical }
const KIND_LABEL: Record<CanvasKind, string> = {
  SEGMENT: 'Сегмент',
  JTBD: 'Задача клиента',
  HYPOTHESIS: 'Гипотеза',
}

export function ProductCanvasNode({ data, selected }: NodeProps) {
  const { kind, label, fullLabel, meta, dangling } = data as ProductCanvasNodeData
  const tone = signalToneColors[KIND_TONE[kind]]
  const Icon = KIND_ICON[kind]

  return (
    <div
      className="relative w-60 rounded-md border bg-card py-2.5 pl-3 pr-2.5 shadow-sm"
      style={{
        borderLeft: `4px solid ${tone.border}`,
        // A dashed outline, not a red one: an unfinished chain is normal
        // mid-discovery, and colouring it like an error would nag rather than
        // inform. Tooltip says which link is missing.
        outline: dangling ? '1px dashed hsl(var(--muted-foreground))' : undefined,
        outlineOffset: dangling ? '2px' : undefined,
        boxShadow: selected ? '0 0 0 1.5px hsl(var(--primary))' : undefined,
      }}
      title={dangling ? danglingReason(kind) : undefined}
    >
      {/* Segments start the chain and hypotheses end it, so neither grows an
          unusable handle: a target handle on a segment would invite a drag
          that canLink() only rejects afterwards. */}
      {kind !== 'SEGMENT' && (
        <Handle type="target" position={Position.Left} className="!bg-muted-foreground" />
      )}
      <div className="mb-1.5 flex items-center gap-1.5">
        <Icon size={13} strokeWidth={1.75} style={{ color: tone.border }} aria-hidden />
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          {KIND_LABEL[kind]}
        </span>
      </div>
      <p title={fullLabel ?? label} className="line-clamp-2 text-[13.5px] font-medium leading-snug">
        {label}
      </p>
      {meta && (
        <div className="mt-2 border-t pt-1.5">
          <p className="truncate font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            {meta}
          </p>
        </div>
      )}
      {kind !== 'HYPOTHESIS' && (
        <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />
      )}
    </div>
  )
}
