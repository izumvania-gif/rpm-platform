'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
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
import type { JTBD, JtbdSequenceEdge } from '@prisma/client'
import { JtbdNode } from './jtbd-node'
import {
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

function GraphInner({
  jtbds,
  sequenceEdges,
  category,
}: {
  jtbds: JTBD[]
  sequenceEdges: JtbdSequenceEdge[]
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
        data: { title: j.title, category: j.category, confirmed: j.confirmed },
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
        </ReactFlow>
      </div>
      <p className="text-xs text-muted-foreground">
        Перетащите узел на другой, чтобы сделать его дочерним (пунктирная связь). Потяните от края
        узла к другому узлу, чтобы задать последовательность (сплошная стрелка). Выделите связь и
        нажмите Delete, чтобы удалить её. Клик по узлу открывает карточку JTBD.
      </p>
    </div>
  )
}

export function JtbdGraphCanvas(props: {
  jtbds: JTBD[]
  sequenceEdges: JtbdSequenceEdge[]
  category?: string
}) {
  return (
    <ReactFlowProvider>
      <GraphInner {...props} />
    </ReactFlowProvider>
  )
}
