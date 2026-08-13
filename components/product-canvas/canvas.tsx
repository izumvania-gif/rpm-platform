'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Panel,
  MarkerType,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  type OnConnect,
  type NodeMouseHandler,
  type OnNodeDrag,
  type OnEdgesDelete,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ProductCanvasNode } from './canvas-node'
import {
  buildCanvasGraph,
  canLink,
  parseNodeKey,
  type CanvasGraphInput,
  type CanvasKind,
} from '@/lib/product-canvas'
import {
  createCanvasNode,
  linkCanvasNodes,
  saveCanvasPositions,
  unlinkCanvasNodes,
} from '@/lib/actions/product-canvas'

const nodeTypes = { canvas: ProductCanvasNode }

// Enough to keep the inline create form fully inside the clipped canvas; the
// height covers its tallest state (JTBD, which adds the category field).
const FORM_WIDTH = 288
const FORM_HEIGHT = 230

const ROUTE_FOR: Record<CanvasKind, string> = {
  SEGMENT: '/segments',
  JTBD: '/jtbd',
  HYPOTHESIS: '/hypotheses',
}
const KIND_OPTIONS: { value: CanvasKind; label: string }[] = [
  { value: 'SEGMENT', label: 'Сегмент' },
  { value: 'JTBD', label: 'Задача клиента' },
  { value: 'HYPOTHESIS', label: 'Гипотеза' },
]

// Inline creation at the point of the double-click (C2's "двойной клик по
// пустому месту создаёт узел прямо там"). Positioned absolutely over the
// canvas rather than as a React Flow <Panel>, because it has to appear where
// the pointer was, not in one of the four Panel corners.
function CreateAt({
  at,
  onCancel,
  onCreate,
  pending,
}: {
  at: { screenX: number; screenY: number }
  onCancel: () => void
  onCreate: (kind: CanvasKind, title: string, category: string) => void
  pending: boolean
}) {
  const [kind, setKind] = useState<CanvasKind>('JTBD')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')

  return (
    <div
      className="absolute z-20 w-72 rounded-md border bg-background p-3 shadow-lg"
      style={{ left: at.screenX, top: at.screenY }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="space-y-2">
        <Select
          aria-label="Тип узла"
          value={kind}
          onChange={(e) => setKind(e.target.value as CanvasKind)}
        >
          {KIND_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Input
          autoFocus
          aria-label="Название узла"
          placeholder={kind === 'HYPOTHESIS' ? 'Если …, то …' : 'Название'}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onCancel()
            if (e.key === 'Enter') onCreate(kind, title, category)
          }}
        />
        {/* Only a JTBD asks for more, and it is not optional — a placeholder
            category would poison the coverage and gaps reports. */}
        {kind === 'JTBD' && (
          <Input
            aria-label="Категория задачи"
            placeholder="Категория"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onCancel()
              if (e.key === 'Enter') onCreate(kind, title, category)
            }}
          />
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            disabled={pending || !title.trim()}
            onClick={() => onCreate(kind, title, category)}
          >
            Создать
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onCancel}>
            Отмена
          </Button>
        </div>
      </div>
    </div>
  )
}

function CanvasInner({
  productId,
  data,
}: {
  productId: string
  data: Omit<CanvasGraphInput, 'positions'> & { positions: CanvasGraphInput['positions'] }
}) {
  const router = useRouter()
  const { screenToFlowPosition } = useReactFlow()
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState<{
    screenX: number
    screenY: number
    flowX: number
    flowY: number
  } | null>(null)
  const [isPending, startTransition] = useTransition()

  const built = useMemo(() => {
    const graph = buildCanvasGraph(data)
    const nodes: Node[] = graph.nodes.map((n) => ({
      id: n.id,
      type: 'canvas',
      position: n.position,
      data: { kind: n.kind, label: n.label, meta: n.meta, dangling: n.dangling },
    }))
    const edges: Edge[] = graph.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { relation: e.relation },
    }))
    return { nodes, edges }
  }, [data])

  const [nodes, setNodes, onNodesChange] = useNodesState(built.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(built.edges)

  useEffect(() => {
    setNodes(built.nodes)
    setEdges(built.edges)
  }, [built, setNodes, setEdges])

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      const source = connection.source && parseNodeKey(connection.source)
      const target = connection.target && parseNodeKey(connection.target)
      if (!source || !target) return
      if (!canLink(source.kind, target.kind)) {
        setError('Связь идёт по цепочке: сегмент → задача → гипотеза')
        return
      }
      startTransition(async () => {
        const result = await linkCanvasNodes(productId, source, target)
        if (!result.ok) {
          setError(result.error)
          return
        }
        setError(null)
        router.refresh()
      })
    },
    [productId, router]
  )

  const onEdgesDelete: OnEdgesDelete = useCallback(
    (deleted) => {
      startTransition(async () => {
        for (const edge of deleted) {
          const source = parseNodeKey(edge.source)
          const target = parseNodeKey(edge.target)
          if (!source || !target) continue
          const result = await unlinkCanvasNodes(productId, source, target)
          if (!result.ok) setError(result.error)
        }
        router.refresh()
      })
    },
    [productId, router]
  )

  const onNodeDragStop: OnNodeDrag = useCallback(
    (_event, node) => {
      const parsed = parseNodeKey(node.id)
      if (!parsed) return
      startTransition(async () => {
        await saveCanvasPositions(productId, [
          { kind: parsed.kind, id: parsed.id, x: node.position.x, y: node.position.y },
        ])
      })
    },
    [productId]
  )

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const parsed = parseNodeKey(node.id)
      if (!parsed) return
      router.push(`${ROUTE_FOR[parsed.kind]}/${parsed.id}`)
    },
    [router]
  )

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div
        className="relative h-[640px] rounded-md border"
        onDoubleClick={(event) => {
          // The handler lives here, not on <ReactFlow>, because React Flow's
          // own zoomOnDoubleClick (d3-zoom) consumes the event before any
          // prop on that component sees it — the create form simply never
          // opened. zoomOnDoubleClick is off below so this is unambiguous.
          // Double-clicking a node is not "create here", so ignore those.
          // Nodes and the canvas furniture (minimap, zoom controls, the hint
          // panel) are not "empty space". The minimap already happened to
          // swallow the event via its own d3 handler, but relying on that is
          // luck, not a rule.
          const target = event.target as HTMLElement
          if (
            target.closest(
              '.react-flow__node, .react-flow__minimap, .react-flow__controls, .react-flow__panel'
            )
          ) {
            return
          }
          const bounds = event.currentTarget.getBoundingClientRect()
          const flow = screenToFlowPosition({ x: event.clientX, y: event.clientY })
          // Clamp the panel inside the canvas. React Flow clips its container,
          // so a double-click near the right or bottom edge would otherwise
          // open the form off-screen — it looked like nothing happened at all.
          // The new node still lands at the true double-clicked flow point;
          // only the form moves.
          setCreating({
            screenX: Math.min(event.clientX - bounds.left, Math.max(0, bounds.width - FORM_WIDTH)),
            screenY: Math.min(event.clientY - bounds.top, Math.max(0, bounds.height - FORM_HEIGHT)),
            flowX: flow.x,
            flowY: flow.y,
          })
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgesDelete={onEdgesDelete}
          onNodeDragStop={onNodeDragStop}
          onNodeClick={onNodeClick}
          onPaneClick={() => setCreating(null)}
          zoomOnDoubleClick={false}
          nodeTypes={nodeTypes}
          fitView
          // Cap the fit zoom at 1:1. React Flow's default maxZoom is 2, so a
          // canvas with one or two nodes opens at 200% — cards render twice
          // their size, overlap each other, and a node can end up covering a
          // neighbour's connection handle, which makes dragging a link
          // impossible until the user zooms out. Found exactly that way.
          fitViewOptions={{ maxZoom: 1 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
          <MiniMap pannable zoomable />
          <Panel position="top-left" className="!m-2">
            <div className="rounded-md border bg-background/95 px-3 py-2 text-xs text-muted-foreground shadow-sm">
              Двойной клик по пустому месту — новый узел. Тяните от края узла, чтобы связать:
              сегмент → задача → гипотеза. Выделите связь и Delete, чтобы разорвать.
            </div>
          </Panel>
        </ReactFlow>

        {creating && (
          <CreateAt
            at={creating}
            pending={isPending}
            onCancel={() => setCreating(null)}
            onCreate={(kind, title, category) => {
              startTransition(async () => {
                const result = await createCanvasNode(productId, {
                  kind,
                  title,
                  category,
                  x: creating.flowX,
                  y: creating.flowY,
                })
                if (!result.ok) {
                  setError(result.error)
                  return
                }
                setError(null)
                setCreating(null)
                router.refresh()
              })
            }}
          />
        )}
      </div>
    </div>
  )
}

export function ProductCanvas(props: { productId: string; data: CanvasGraphInput }) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  )
}
