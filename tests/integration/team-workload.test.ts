import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { getProductTeamWorkload } from '@/lib/team-workload'
import { createTestProduct, ensureTestUser } from './helpers'
import { DEFAULT_USER_ID } from '@/lib/current-user'

beforeEach(ensureTestUser)

describe('getProductTeamWorkload', () => {
  it('counts active vs total roadmap items per assigned person, sorted by active count', async () => {
    const product = await createTestProduct()
    const busy = await prisma.person.create({
      data: { name: 'Busy PM', skills: [], userId: DEFAULT_USER_ID },
    })
    const idle = await prisma.person.create({
      data: { name: 'Mostly Done', skills: [], userId: DEFAULT_USER_ID },
    })

    await prisma.roadmapItem.createMany({
      data: [
        { title: 'A', status: 'PLANNED', visibility: 'INTERNAL', productId: product.id, ownerId: busy.id, userId: DEFAULT_USER_ID },
        { title: 'B', status: 'IN_PROGRESS', visibility: 'INTERNAL', productId: product.id, ownerId: busy.id, userId: DEFAULT_USER_ID },
        { title: 'C', status: 'SHIPPED', visibility: 'INTERNAL', productId: product.id, ownerId: busy.id, userId: DEFAULT_USER_ID },
        { title: 'D', status: 'SHIPPED', visibility: 'INTERNAL', productId: product.id, ownerId: idle.id, userId: DEFAULT_USER_ID },
        { title: 'E', status: 'PAUSED', visibility: 'INTERNAL', productId: product.id, ownerId: idle.id, userId: DEFAULT_USER_ID },
      ],
    })

    const result = await getProductTeamWorkload(DEFAULT_USER_ID, product.id)

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      person: { id: busy.id },
      activeCount: 2,
      totalCount: 3,
    })
    expect(result[1]).toMatchObject({
      person: { id: idle.id },
      activeCount: 0,
      totalCount: 2,
    })
  })

  it('excludes unassigned roadmap items and people from other products', async () => {
    const product = await createTestProduct()
    const otherProduct = await createTestProduct()
    const person = await prisma.person.create({
      data: { name: 'Other Product PM', skills: [], userId: DEFAULT_USER_ID },
    })
    await prisma.roadmapItem.create({
      data: {
        title: 'Unassigned',
        status: 'PLANNED',
        visibility: 'INTERNAL',
        productId: product.id,
        userId: DEFAULT_USER_ID,
      },
    })
    await prisma.roadmapItem.create({
      data: {
        title: 'Elsewhere',
        status: 'PLANNED',
        visibility: 'INTERNAL',
        productId: otherProduct.id,
        ownerId: person.id,
        userId: DEFAULT_USER_ID,
      },
    })

    const result = await getProductTeamWorkload(DEFAULT_USER_ID, product.id)
    expect(result).toEqual([])
  })

  it('returns an empty array for a product with no roadmap items', async () => {
    const product = await createTestProduct()
    expect(await getProductTeamWorkload(DEFAULT_USER_ID, product.id)).toEqual([])
  })
})
