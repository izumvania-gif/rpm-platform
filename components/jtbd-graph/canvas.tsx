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
import { jtbdJobTypeColors, jtbdJobTypeLabels, jtbdJobTypeOrder } from '@/lib/jtbd-job-types'
import {
  createJtbdQuick,
  createJtbdSequenceEdge,
  deleteJtbdSequenceEdge,
  setJtbdParent,
} from '@/lib/actions/jtbd-graph'

const nodeTypes = { jtbd: JtbdNode }

interface LayoutPosition {
  x: number
  y: number
}

const NODE_WIDTH = 260
const LEVEL_HEIGHT = 160

function layoutTree(jtbds: JTBD[]): Map<string, LayoutPosition> {
  const nodeMap = new Map(jtbds.map((j) => [j.id, j]))
  const childrenMap = new Map<string, JTBD[]>()
  for (const j of jtbds) {
    if (j.parentId && nodeMap.has(j.parentId)) {
      if (!childrenMap.has(j.parentId)) childrenMap.set(j.parentId, [])
      childrenMap.get(j.parentId)!.push(j)
    }
  }
  for (const children of childrenMap.values()) {
    children.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  }
  const roots = jtbds
    .filter((j) => !j.parentId || !nodeMap.has(j.parentId))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

  const positions = new Map<string, LayoutPosition>()
  let leafCounter = 0

  function visit(node: JTBD, depth: number) {
    const children = childrenMap.get(node.id) ?? []
    if (children.length === 0) {
      positions.set(node.id, { x: leafCounter * NODE_WIDTH, y: depth * LEVEL_HEIGHT })
      leafCounter++
    } else {
      for (const child of children) visit(child, depth + 1)
      const childXs = children.map((c) => positions.get(c.id)!.x)
      const x = (Math.min(...childXs) + Math.max(...childXs)) / 2
      positions.set(node.id, { x, y: depth * LEVEL_HEIGHT })
    }
  }

  for (const root of roots) visit(root, 0)
  return positions
}

function Legend() {
  return (
    <Panel
      position="bottom-left"
      className="!m-2 rounded-md border bg-background/95 p-2.5 text-xs shadow-sm backdrop-blur"
    >
      <p className="mb-1.5 font-semibold text-muted-foreground">Типы задач</p>
      <div className="mb-2 grid grid-cols-2 gap-x-3 gap-y-1">
        {jtbdJobTypeOrder.map((type) => (
          <div key={type} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm border"
              style={{
                backgroundColor: jtbdJobTypeColors[type].bg,
                borderColor: jtbdJobTypeColors[type].border,
              }}
            />
            <span className="truncate">{jtbdJobTypeLabels[type]}</span>
          </div>
        ))}
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
            <line x1="0" y1="4" x2="20" y2="4" stroke="#3B82F6" strokeWidth="1.5" />
            <polygon points="20,1 24,4 20,7" fill="#3B82F6" />
          </svg>
          <span>Следует за (sequence)</span>
        </div>
      </div>
    </Panel>
  )
}

function AddJtbdPanel({ productId, categories }: { productId: string; categories: string[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [jobType, setJobType] = useState<JtbdJobType>(JtbdJobType.SMALL_JOB)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit() {
    startTransition(async () => {
      const result = await createJtbdQuick(productId, title, category, jobType)
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
          <Select value={jobType} onChange={(e) => setJobType(e.target.value as JtbdJobType)}>
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
}: {
  productId: string
  jtbds: JTBD[]
  sequenceEdges: JtbdSequenceEdge[]
  categories: string[]
  category?: string
}) {
  const router = useRouter()
  const { getIntersectingNodes } = useReactFlow()
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const initial = useMemo(() => {
    const visibleIds = category
      ? new Set(jtbds.filter((j) => j.category === category).map((j) => j.id))
      : null
    const positions = layoutTree(jtbds)

    const nodes: Node[] = jtbds
      .filter((j) => !visibleIds || visibleIds.has(j.id))
      .map((j) => ({
        id: j.id,
        type: 'jtbd',
        position: positions.get(j.id) ?? { x: 0, y: 0 },
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
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: '#3B82F6' },
        data: { kind: 'sequence', edgeId: e.id },
      }))

    return { nodes, edges: [...hierarchyEdges, ...seqEdges] }
  }, [jtbds, sequenceEdges, category])

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
      if (intersections.length === 0) return
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
    },
    [getIntersectingNodes, router]
  )

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      router.push(`/jtbd/${node.id}`)
    },
    [router]
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
            <AddJtbdPanelInline productId={productId} categories={categories} />
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
            <MiniMap pannable zoomable />
            <AddJtbdPanel productId={productId} categories={categories} />
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
}: {
  productId: string
  categories: string[]
}) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [jobType, setJobType] = useState<JtbdJobType>(JtbdJobType.BIG_JOB)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit() {
    startTransition(async () => {
      const result = await createJtbdQuick(productId, title, category, jobType)
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
      <Select value={jobType} onChange={(e) => setJobType(e.target.value as JtbdJobType)}>
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
}) {
  return (
    <ReactFlowProvider>
      <GraphInner {...props} />
    </ReactFlowProvider>
  )
}
