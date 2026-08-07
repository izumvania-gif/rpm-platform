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
import { JtbdJobType, type JTBD, type JtbdSequenceEdge } from '@prisma/client'
import { JtbdNode } from './jtbd-node'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  jtbdJobTypeColors,
  jtbdJobTypeIcon,
  jtbdJobTypeLabels,
  jtbdJobTypeOrder,
} from '@/lib/jtbd-job-types'
import { layoutTree, OVERALL_VIEW_KEY, type LayoutPosition } from '@/lib/jtbd-graph-layout'
import {
  createJtbdQuick,
  createJtbdSequenceEdge,
  deleteJtbdSequenceEdge,
  saveJtbdGraphPositions,
  setJtbdParent,
} from '@/lib/actions/jtbd-graph'

const nodeTypes = { jtbd: JtbdNode }

function Legend() {
  return (
    <Panel
      position="bottom-left"
      className="!m-2 rounded-md border bg-background/95 p-2.5 text-xs shadow-sm backdrop-blur"
    >
      <p className="mb-1.5 font-semibold text-muted-foreground">Типы задач</p>
      <div className="mb-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
        {jtbdJobTypeOrder.map((type) => {
          const Icon = jtbdJobTypeIcon[type]
          return (
            <div key={type} className="flex items-center gap-1.5">
              <Icon
                size={12}
                strokeWidth={1.75}
                className="shrink-0"
                style={{ color: jtbdJobTypeColors[type].border }}
              />
              <span className="truncate">{jtbdJobTypeLabels[type]}</span>
            </div>
          )
        })}
      </div>
      <p className="mb-1 font-semibold text-muted-foreground">Связи</p>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <svg width="24" height="8" className="shrink-0">
            <line
              x1="0"
              y1="4"
              x2="24"
              y2="4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          </svg>
          <span>Родитель → потомок</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="24" height="8" className="shrink-0">
            <line
              x1="0"
              y1="4"
              x2="20"
              y2="4"
              stroke="hsl(var(--signal-blue-border))"
              strokeWidth="1.5"
            />
            <polygon points="20,1 24,4 20,7" fill="hsl(var(--signal-blue-border))" />
          </svg>
          <span>Следует за (sequence)</span>
        </div>
      </div>
    </Panel>
  )
}

function AddJtbdPanel({
  productId,
  categories,
  segmentId,
}: {
  productId: string
  categories: string[]
  segmentId: string | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [jobType, setJobType] = useState<JtbdJobType>(JtbdJobType.SMALL_JOB)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit() {
    startTransition(async () => {
      const result = await createJtbdQuick(
        productId,
        title,
        category,
        jobType,
        segmentId ? [segmentId] : undefined
      )
      if (!result.ok) {
        setError(result.error)
        return
      }
      setTitle('')
      setCategory('')
      setError(null)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Panel position="top-left" className="!m-2">
      {!open ? (
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          + Добавить JTBD
        </Button>
      ) : (
        <div className="w-72 space-y-2 rounded-md border bg-background p-3 shadow-md">
          <Input
            autoFocus
            placeholder="Когда ..., я хочу ..., чтобы ..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            placeholder="Категория"
            list="graph-jtbd-categories"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <datalist id="graph-jtbd-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <Select
            aria-label="Тип задачи"
            value={jobType}
            onChange={(e) => setJobType(e.target.value as JtbdJobType)}
          >
            {jtbdJobTypeOrder.map((type) => (
              <option key={type} value={type}>
                {jtbdJobTypeLabels[type]}
              </option>
            ))}
          </Select>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={isPending || !title.trim() || !category.trim()}
              onClick={submit}
            >
              Создать
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setOpen(false)
                setError(null)
              }}
            >
              Отмена
            </Button>
          </div>
        </div>
      )}
    </Panel>
  )
}

function GraphInner({
  productId,
  jtbds,
  sequenceEdges,
  categories,
  category,
  viewKey,
  savedPositions,
}: {
  productId: string
  jtbds: JTBD[]
  sequenceEdges: JtbdSequenceEdge[]
  categories: string[]
  category?: string
  viewKey: string
  savedPositions: Record<string, LayoutPosition>
}) {
  const router = useRouter()
  const { getIntersectingNodes } = useReactFlow()
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const segmentId = viewKey === OVERALL_VIEW_KEY ? null : viewKey

  const initial = useMemo(() => {
    const visibleIds = category
      ? new Set(jtbds.filter((j) => j.category === category).map((j) => j.id))
      : null
    const fallbackPositions = layoutTree(jtbds)

    const nodes: Node[] = jtbds
      .filter((j) => !visibleIds || visibleIds.has(j.id))
      .map((j) => ({
        id: j.id,
        type: 'jtbd',
        position: savedPositions[j.id] ?? fallbackPositions.get(j.id) ?? { x: 0, y: 0 },
        data: { title: j.title, category: j.category, confirmed: j.confirmed, jobType: j.jobType },
      }))

    const nodeIds = new Set(nodes.map((n) => n.id))
    const hierarchyEdges: Edge[] = jtbds
      .filter((j) => j.parentId && nodeIds.has(j.parentId) && nodeIds.has(j.id))
      .map((j) => ({
        id: `h-${j.parentId}-${j.id}`,
        source: j.parentId as string,
        target: j.id,
        style: { strokeDasharray: '4 4' },
        data: { kind: 'hierarchy' },
      }))
    const seqEdges: Edge[] = sequenceEdges
      .filter((e) => nodeIds.has(e.fromJtbdId) && nodeIds.has(e.toJtbdId))
      .map((e) => ({
        id: `s-${e.id}`,
        source: e.fromJtbdId,
        target: e.toJtbdId,
        markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--signal-blue-border))' },
        style: { stroke: 'hsl(var(--signal-blue-border))' },
        data: { kind: 'sequence', edgeId: e.id },
      }))

    return { nodes, edges: [...hierarchyEdges, ...seqEdges] }
  }, [jtbds, sequenceEdges, category, savedPositions])

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges)

  useEffect(() => {
    setNodes(initial.nodes)
    setEdges(initial.edges)
  }, [initial, setNodes, setEdges])

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      const { source, target } = connection
      startTransition(async () => {
        const result = await createJtbdSequenceEdge(source, target)
        if (!result.ok) {
          setError(result.error)
          return
        }
        setError(null)
        router.refresh()
      })
    },
    [router]
  )

  const onNodeDragStop: OnNodeDrag = useCallback(
    (_event, node) => {
      const intersections = getIntersectingNodes(node).filter((n) => n.id !== node.id)
      if (intersections.length > 0) {
        const target = intersections[0]
        startTransition(async () => {
          const result = await setJtbdParent(node.id, target.id)
          if (!result.ok) {
            setError(result.error)
            return
          }
          setError(null)
          router.refresh()
        })
        return
      }
      startTransition(async () => {
        await saveJtbdGraphPositions(
          [{ jtbdId: node.id, x: node.position.x, y: node.position.y }],
          viewKey
        )
      })
    },
    [getIntersectingNodes, router, viewKey]
  )

  const handleAutoArrange = useCallback(() => {
    const positions = layoutTree(jtbds)
    setNodes((prev) => prev.map((n) => ({ ...n, position: positions.get(n.id) ?? n.position })))
    const entries = nodes
      .filter((n) => positions.has(n.id))
      .map((n) => {
        const pos = positions.get(n.id)!
        return { jtbdId: n.id, x: pos.x, y: pos.y }
      })
    startTransition(async () => {
      await saveJtbdGraphPositions(entries, viewKey)
    })
  }, [jtbds, nodes, setNodes, viewKey])

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      router.push(`/jtbd/${node.id}?from=graph&productId=${productId}`)
    },
    [router, productId]
  )

  const onEdgesDelete: OnEdgesDelete = useCallback(
    (deleted) => {
      startTransition(async () => {
        for (const edge of deleted) {
          const data = edge.data as { kind?: string; edgeId?: string } | undefined
          if (data?.kind === 'sequence' && data.edgeId) {
            await deleteJtbdSequenceEdge(data.edgeId)
          } else if (data?.kind === 'hierarchy') {
            await setJtbdParent(edge.target, null)
          }
        }
        router.refresh()
      })
    },
    [router]
  )

  return (
    <div className="space-y-2">
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
      <div className="h-[70vh] rounded-md border">
        {nodes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="text-muted-foreground">
              {category ? 'Нет JTBD в этой категории.' : 'У этого продукта пока нет JTBD.'}
            </p>
            <AddJtbdPanelInline productId={productId} categories={categories} segmentId={segmentId} />
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={onNodeClick}
            onEdgesDelete={onEdgesDelete}
            nodeTypes={nodeTypes}
            deleteKeyCode={['Backspace', 'Delete']}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap
              pannable
              zoomable
              bgColor="hsl(var(--card))"
              maskColor="hsl(var(--muted) / 0.6)"
              nodeColor="hsl(var(--muted-foreground) / 0.4)"
              nodeStrokeWidth={0}
              className="!border !border-border"
            />
            <AddJtbdPanel productId={productId} categories={categories} segmentId={segmentId} />
            <Panel position="top-right" className="!m-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAutoArrange}
                title="Пересчитает позиции всех узлов текущего представления по иерархии и перезапишет ручную раскладку — только для этого графа (общего или сегмента), другие представления не затронет"
              >
                Автоматически расставить
              </Button>
            </Panel>
            <Legend />
          </ReactFlow>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Перетащите узел на другой, чтобы сделать его дочерним (пунктирная связь). Потяните от края
        узла к другому узлу, чтобы задать последовательность (сплошная стрелка). Выделите связь и
        нажмите Delete, чтобы удалить её. Клик по узлу открывает карточку JTBD.
      </p>
    </div>
  )
}

function AddJtbdPanelInline({
  productId,
  categories,
  segmentId,
}: {
  productId: string
  categories: string[]
  segmentId: string | null
}) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [jobType, setJobType] = useState<JtbdJobType>(JtbdJobType.BIG_JOB)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit() {
    startTransition(async () => {
      const result = await createJtbdQuick(
        productId,
        title,
        category,
        jobType,
        segmentId ? [segmentId] : undefined
      )
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="w-72 space-y-2 rounded-md border bg-background p-3 text-left shadow-md">
      <Input
        placeholder="Когда ..., я хочу ..., чтобы ..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Input
        placeholder="Категория"
        list="graph-jtbd-categories-empty"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      />
      <datalist id="graph-jtbd-categories-empty">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <Select
            aria-label="Тип задачи"
            value={jobType}
            onChange={(e) => setJobType(e.target.value as JtbdJobType)}
          >
        {jtbdJobTypeOrder.map((type) => (
          <option key={type} value={type}>
            {jtbdJobTypeLabels[type]}
          </option>
        ))}
      </Select>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button
        type="button"
        size="sm"
        disabled={isPending || !title.trim() || !category.trim()}
        onClick={submit}
      >
        Создать первый JTBD
      </Button>
    </div>
  )
}

export function JtbdGraphCanvas(props: {
  productId: string
  jtbds: JTBD[]
  sequenceEdges: JtbdSequenceEdge[]
  categories: string[]
  category?: string
  viewKey: string
  savedPositions: Record<string, LayoutPosition>
}) {
  return (
    <ReactFlowProvider>
      <GraphInner {...props} />
    </ReactFlowProvider>
  )
}
