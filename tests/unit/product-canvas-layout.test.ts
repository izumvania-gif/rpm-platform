import { describe, expect, it } from 'vitest'
import { buildCanvasGraph, layoutCanvas, nodeKey } from '@/lib/product-canvas'

const COLUMN = { SEGMENT: 0, JTBD: 340, HYPOTHESIS: 680 }
const ROW = 130

function input(overrides: Partial<Parameters<typeof layoutCanvas>[0]> = {}) {
  return {
    segments: [{ id: 's1', name: 'Банки', jtbdIds: ['j1'] }],
    jtbds: [{ id: 'j1', title: 'Продлить сертификат', category: 'Выпуск', confirmed: false }],
    hypotheses: [
      {
        id: 'h1',
        statement: 'Если продлевать удалённо, то согласятся',
        status: 'DRAFT',
        jtbdId: 'j1',
      },
    ],
    ...overrides,
  }
}

describe('columns', () => {
  // Колонка на тип, в порядке цепочки: холст читается слева направо.
  it('puts each kind in its own column', () => {
    const positions = layoutCanvas(input())
    expect(positions[nodeKey('SEGMENT', 's1')].x).toBe(COLUMN.SEGMENT)
    expect(positions[nodeKey('JTBD', 'j1')].x).toBe(COLUMN.JTBD)
    expect(positions[nodeKey('HYPOTHESIS', 'h1')].x).toBe(COLUMN.HYPOTHESIS)
  })
})

describe('rows follow the chain', () => {
  // Главное, ради чего раскладка вообще переписана: раньше узлы складывались в
  // колонку по порядку появления, и сегмент мог оказаться в одном конце
  // холста, а его задачи — в другом.
  it('lines a parent up with its children', () => {
    const positions = layoutCanvas({
      segments: [{ id: 's1', name: 'A', jtbdIds: ['j1'] }],
      jtbds: [{ id: 'j1', title: 'J', category: 'C', confirmed: false }],
      hypotheses: [
        { id: 'h1', statement: 'H1', status: 'DRAFT', jtbdId: 'j1' },
        { id: 'h2', statement: 'H2', status: 'DRAFT', jtbdId: 'j1' },
      ],
    })
    // Две гипотезы получают строки 0 и 1; задача встаёт по центру между ними,
    // сегмент — по центру своей единственной задачи.
    expect(positions[nodeKey('HYPOTHESIS', 'h1')].y).toBe(0)
    expect(positions[nodeKey('HYPOTHESIS', 'h2')].y).toBe(ROW)
    expect(positions[nodeKey('JTBD', 'j1')].y).toBe(ROW / 2)
    expect(positions[nodeKey('SEGMENT', 's1')].y).toBe(ROW / 2)
  })

  it('keeps a segment’s own jobs together', () => {
    const positions = layoutCanvas({
      segments: [
        { id: 's1', name: 'A', jtbdIds: ['j1'] },
        { id: 's2', name: 'B', jtbdIds: ['j2'] },
      ],
      jtbds: [
        { id: 'j1', title: 'J1', category: 'C', confirmed: false },
        { id: 'j2', title: 'J2', category: 'C', confirmed: false },
      ],
      hypotheses: [],
    })
    expect(positions[nodeKey('SEGMENT', 's1')].y).toBe(positions[nodeKey('JTBD', 'j1')].y)
    expect(positions[nodeKey('SEGMENT', 's2')].y).toBe(positions[nodeKey('JTBD', 'j2')].y)
  })

  // Узел стоит в одном месте, а задача может принадлежать нескольким
  // сегментам: её ставит первый, кто её называет. Выбор произвольный, но
  // детерминированный — иначе раскладка «прыгала» бы между перезагрузками.
  it('places a shared job once, under the first segment that names it', () => {
    const positions = layoutCanvas({
      segments: [
        { id: 's1', name: 'A', jtbdIds: ['j1'] },
        { id: 's2', name: 'B', jtbdIds: ['j1'] },
      ],
      jtbds: [{ id: 'j1', title: 'J1', category: 'C', confirmed: false }],
      hypotheses: [],
    })
    expect(positions[nodeKey('SEGMENT', 's1')].y).toBe(positions[nodeKey('JTBD', 'j1')].y)
    expect(positions[nodeKey('SEGMENT', 's2')].y).not.toBe(positions[nodeKey('JTBD', 'j1')].y)
  })
})

describe('orphans', () => {
  // Задача без сегмента и гипотеза без задачи — ровно те, кого холст рисует
  // пунктиром. Прятать их в раскладке нельзя.
  it('places everything, including what hangs off nothing', () => {
    const positions = layoutCanvas({
      segments: [],
      jtbds: [{ id: 'j1', title: 'J', category: 'C', confirmed: false }],
      hypotheses: [{ id: 'h1', statement: 'H', status: 'DRAFT', jtbdId: null }],
    })
    expect(positions[nodeKey('JTBD', 'j1')]).toBeDefined()
    expect(positions[nodeKey('HYPOTHESIS', 'h1')]).toBeDefined()
  })

  it('gives every node a place, and no two the same slot in a column', () => {
    const positions = layoutCanvas({
      segments: [{ id: 's1', name: 'A', jtbdIds: [] }],
      jtbds: [
        { id: 'j1', title: 'J1', category: 'C', confirmed: false },
        { id: 'j2', title: 'J2', category: 'C', confirmed: false },
      ],
      hypotheses: [],
    })
    expect(Object.keys(positions)).toHaveLength(3)
    expect(positions[nodeKey('JTBD', 'j1')].y).not.toBe(positions[nodeKey('JTBD', 'j2')].y)
  })
})

describe('manual placement wins', () => {
  // Правка 5 плана: слоистая раскладка — это начальное положение, а не замена
  // ручной расстановке. Всё, что человек перетащил, сохранено и побеждает.
  it('uses the saved position over the computed one', () => {
    const saved = { x: 999, y: 111 }
    const graph = buildCanvasGraph({
      ...input(),
      positions: { [nodeKey('JTBD', 'j1')]: saved },
    })
    const jtbd = graph.nodes.find((n) => n.id === nodeKey('JTBD', 'j1'))!
    expect(jtbd.position).toEqual(saved)
    // Соседи, которых не трогали, остаются на вычисленных местах.
    const segment = graph.nodes.find((n) => n.id === nodeKey('SEGMENT', 's1'))!
    expect(segment.position.x).toBe(COLUMN.SEGMENT)
  })
})
