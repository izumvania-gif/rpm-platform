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
  CANVAS_KIND_ORDER,
  buildCanvasGraph,
  canLink,
  canvasKindLabels,
  canvasKindPluralLabels,
  layoutCanvas,
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
const KIND_OPTIONS = CANVAS_KIND_ORDER.map((value) => ({ value, label: canvasKindLabels[value] }))

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

  // Фильтр по типу узла (фаза 12). Состояние только клиентское и не
  // сохраняется: это способ разглядеть один слой прямо сейчас, а не настройка
  // холста. Признак «цепочка оборвана» при этом считается на ПОЛНЫХ данных на
  // сервере, поэтому задача без гипотезы остаётся пунктирной и тогда, когда
  // гипотезы скрыты, — иначе фильтр показывал бы благополучие, которого нет.
  const [visibleKinds, setVisibleKinds] = useState<Set<CanvasKind>>(
    () => new Set(CANVAS_KIND_ORDER)
  )

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

  const countByKind = useMemo(() => {
    const counts: Record<CanvasKind, number> = { SEGMENT: 0, JTBD: 0, HYPOTHESIS: 0 }
    counts.SEGMENT = data.segments.length
    counts.JTBD = data.jtbds.length
    counts.HYPOTHESIS = data.hypotheses.length
    return counts
  }, [data])

  // Скрытие через `hidden`, а не через выбрасывание из массива: React Flow
  // сохраняет позиции и выделение узлов, а ребро само прячется вместе со
  // своим концом.
  const shownNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        hidden: !visibleKinds.has((node.data as { kind: CanvasKind }).kind),
      })),
    [nodes, visibleKinds]
  )
  const hiddenNodeIds = useMemo(
    () => new Set(shownNodes.filter((n) => n.hidden).map((n) => n.id)),
    [shownNodes]
  )
  const shownEdges = useMemo(
    () =>
      edges.map((edge) => ({
        ...edge,
        hidden: hiddenNodeIds.has(edge.source) || hiddenNodeIds.has(edge.target),
      })),
    [edges, hiddenNodeIds]
  )

  const relayout = useCallback(() => {
    const computed = layoutCanvas(data)
    setNodes((current) =>
      current.map((node) => ({ ...node, position: computed[node.id] ?? node.position }))
    )
    startTransition(async () => {
      const entries = Object.entries(computed).flatMap(([key, position]) => {
        const parsed = parseNodeKey(key)
        return parsed ? [{ ...parsed, x: position.x, y: position.y }] : []
      })
      await saveCanvasPositions(productId, entries)
    })
  }, [data, productId, setNodes])

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
          nodes={shownNodes}
          edges={shownEdges}
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
          <Panel position="top-left" className="!m-2 max-w-[22rem]">
            <div className="space-y-2 rounded-md border bg-background/95 px-3 py-2 text-xs text-muted-foreground shadow-sm">
              <p>
                Двойной клик по пустому месту — новый узел. Тяните от края узла, чтобы связать:
                сегмент → задача → гипотеза. Выделите связь и Delete, чтобы разорвать.
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {CANVAS_KIND_ORDER.map((kind) => {
                  const on = visibleKinds.has(kind)
                  return (
                    <button
                      key={kind}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setVisibleKinds((current) => {
                          const next = new Set(current)
                          if (next.has(kind)) next.delete(kind)
                          else next.add(kind)
                          return next
                        })
                      }
                      className={
                        'rounded border px-1.5 py-0.5 transition-colors ' +
                        (on
                          ? 'border-primary/50 bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-accent')
                      }
                    >
                      {canvasKindPluralLabels[kind]} {countByKind[kind]}
                    </button>
                  )
                })}
              </div>
            </div>
          </Panel>
          <Panel position="top-right" className="!m-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={relayout}
            >
              Разложить заново
            </Button>
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
