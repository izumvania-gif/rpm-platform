// Shared between the graph page (Server Component, computes missing positions on
// load) and the canvas (Client Component, recomputes on "Автоматически расставить").
// See plans/growth-plan.md §2.9.1.

export interface LayoutPosition {
  x: number
  y: number
}

interface LayoutableJtbd {
  id: string
  parentId: string | null
  createdAt: Date
}

const NODE_WIDTH = 260
const LEVEL_HEIGHT = 160

export function layoutTree(jtbds: LayoutableJtbd[]): Map<string, LayoutPosition> {
  const nodeMap = new Map(jtbds.map((j) => [j.id, j]))
  const childrenMap = new Map<string, LayoutableJtbd[]>()
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

  function visit(node: LayoutableJtbd, depth: number) {
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

export const OVERALL_VIEW_KEY = 'overall'
