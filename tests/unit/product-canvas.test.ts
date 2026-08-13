import { describe, expect, it } from 'vitest'
import {
  buildCanvasGraph,
  canLink,
  nodeKey,
  parseNodeKey,
  relationFor,
  type CanvasGraphInput,
} from '@/lib/product-canvas'

function input(overrides: Partial<CanvasGraphInput> = {}): CanvasGraphInput {
  return { segments: [], jtbds: [], hypotheses: [], positions: {}, ...overrides }
}

const jtbd = { id: 'j1', title: 'Выпустить сертификат', category: 'Онбординг', confirmed: false }

describe('node keys', () => {
  it('round-trips kind and id', () => {
    expect(parseNodeKey(nodeKey('JTBD', 'abc'))).toEqual({ kind: 'JTBD', id: 'abc' })
  })

  it('keeps ids containing a colon intact', () => {
    // Only the first colon separates; ids are opaque and must survive.
    expect(parseNodeKey('SEGMENT:a:b')).toEqual({ kind: 'SEGMENT', id: 'a:b' })
  })

  it('rejects a malformed or unknown key', () => {
    expect(parseNodeKey('nope')).toBeNull()
    expect(parseNodeKey('FEATURE:1')).toBeNull()
    expect(parseNodeKey('JTBD:')).toBeNull()
  })

  it('separates records of different kinds that share an id', () => {
    expect(nodeKey('SEGMENT', 'same')).not.toBe(nodeKey('JTBD', 'same'))
  })
})

describe('canLink', () => {
  it('allows the chain in its own direction', () => {
    expect(canLink('SEGMENT', 'JTBD')).toBe(true)
    expect(canLink('JTBD', 'HYPOTHESIS')).toBe(true)
  })

  it('rejects the reverse of a legal link', () => {
    // Backwards is a mistake, not a different relation — better refused than
    // guessed at.
    expect(canLink('JTBD', 'SEGMENT')).toBe(false)
    expect(canLink('HYPOTHESIS', 'JTBD')).toBe(false)
  })

  it('rejects skipping a link in the chain', () => {
    expect(canLink('SEGMENT', 'HYPOTHESIS')).toBe(false)
  })

  it('rejects self-kind links', () => {
    expect(canLink('JTBD', 'JTBD')).toBe(false)
    expect(canLink('SEGMENT', 'SEGMENT')).toBe(false)
  })

  it('names the relation for legal pairs only', () => {
    expect(relationFor('SEGMENT', 'JTBD')).toBe('segment-jtbd')
    expect(relationFor('JTBD', 'HYPOTHESIS')).toBe('jtbd-hypothesis')
    expect(relationFor('HYPOTHESIS', 'SEGMENT')).toBeNull()
  })
})

describe('buildCanvasGraph', () => {
  it('renders one node per record across all three kinds', () => {
    const { nodes } = buildCanvasGraph(
      input({
        segments: [{ id: 's1', name: 'Банки', jtbdIds: ['j1'] }],
        jtbds: [jtbd],
        hypotheses: [{ id: 'h1', statement: 'Если A, то B', status: 'Черновик', jtbdId: 'j1' }],
      })
    )
    expect(nodes.map((n) => n.kind)).toEqual(['SEGMENT', 'JTBD', 'HYPOTHESIS'])
  })

  it('derives edges from the existing relations', () => {
    const { edges } = buildCanvasGraph(
      input({
        segments: [{ id: 's1', name: 'Банки', jtbdIds: ['j1'] }],
        jtbds: [jtbd],
        hypotheses: [{ id: 'h1', statement: 'Если A, то B', status: 'Черновик', jtbdId: 'j1' }],
      })
    )
    expect(edges).toHaveLength(2)
    expect(edges.map((e) => e.relation).sort()).toEqual(['jtbd-hypothesis', 'segment-jtbd'])
    expect(edges[0]).toMatchObject({ source: 'SEGMENT:s1', target: 'JTBD:j1' })
  })

  it('drops an edge pointing at a job outside this product', () => {
    // Segments carry ids from the relation; a stale or foreign one must not
    // produce an edge to a node that was never rendered.
    const { edges } = buildCanvasGraph(
      input({ segments: [{ id: 's1', name: 'Банки', jtbdIds: ['missing'] }], jtbds: [jtbd] })
    )
    expect(edges).toHaveLength(0)
  })

  it('ignores a hypothesis whose job is not on the canvas', () => {
    const { edges } = buildCanvasGraph(
      input({ hypotheses: [{ id: 'h1', statement: 'x', status: 'Черновик', jtbdId: 'gone' }] })
    )
    expect(edges).toHaveLength(0)
  })

  it('marks a segment with no jobs as dangling', () => {
    const { nodes } = buildCanvasGraph(
      input({ segments: [{ id: 's1', name: 'Банки', jtbdIds: [] }] })
    )
    expect(nodes[0].dangling).toBe(true)
  })

  it('marks a job that no segment claims as dangling', () => {
    const { nodes } = buildCanvasGraph(
      input({
        jtbds: [jtbd],
        hypotheses: [{ id: 'h1', statement: 'x', status: 'Черновик', jtbdId: 'j1' }],
      })
    )
    expect(nodes.find((n) => n.kind === 'JTBD')?.dangling).toBe(true)
  })

  it('marks a job that nothing tests as dangling', () => {
    const { nodes } = buildCanvasGraph(
      input({ segments: [{ id: 's1', name: 'Банки', jtbdIds: ['j1'] }], jtbds: [jtbd] })
    )
    expect(nodes.find((n) => n.kind === 'JTBD')?.dangling).toBe(true)
  })

  it('leaves a fully linked job unmarked', () => {
    const { nodes } = buildCanvasGraph(
      input({
        segments: [{ id: 's1', name: 'Банки', jtbdIds: ['j1'] }],
        jtbds: [jtbd],
        hypotheses: [{ id: 'h1', statement: 'x', status: 'Черновик', jtbdId: 'j1' }],
      })
    )
    expect(nodes.every((n) => n.dangling === false)).toBe(true)
  })

  it('marks an unattached hypothesis as dangling', () => {
    const { nodes } = buildCanvasGraph(
      input({ hypotheses: [{ id: 'h1', statement: 'x', status: 'Черновик', jtbdId: null }] })
    )
    expect(nodes[0].dangling).toBe(true)
  })

  it('lays untouched nodes out in chain order, one column per kind', () => {
    const { nodes } = buildCanvasGraph(
      input({
        segments: [{ id: 's1', name: 'Банки', jtbdIds: [] }],
        jtbds: [jtbd],
        hypotheses: [{ id: 'h1', statement: 'x', status: 'Черновик', jtbdId: null }],
      })
    )
    const [segment, job, hypothesis] = nodes
    expect(segment.position.x).toBeLessThan(job.position.x)
    expect(job.position.x).toBeLessThan(hypothesis.position.x)
  })

  it('stacks same-kind nodes instead of piling them on one point', () => {
    const { nodes } = buildCanvasGraph(
      input({
        segments: [
          { id: 's1', name: 'A', jtbdIds: [] },
          { id: 's2', name: 'B', jtbdIds: [] },
        ],
      })
    )
    expect(nodes[0].position.y).not.toBe(nodes[1].position.y)
  })

  it('prefers a saved position over the fallback layout', () => {
    const { nodes } = buildCanvasGraph(
      input({
        segments: [{ id: 's1', name: 'Банки', jtbdIds: [] }],
        positions: { 'SEGMENT:s1': { x: 42, y: 99 } },
      })
    )
    expect(nodes[0].position).toEqual({ x: 42, y: 99 })
  })

  it('carries the label and the second line through', () => {
    const { nodes } = buildCanvasGraph(input({ jtbds: [jtbd] }))
    expect(nodes[0].label).toBe('Выпустить сертификат')
    expect(nodes[0].meta).toBe('Онбординг')
  })

  it('is empty for a product with nothing on it', () => {
    expect(buildCanvasGraph(input())).toEqual({ nodes: [], edges: [] })
  })
})
