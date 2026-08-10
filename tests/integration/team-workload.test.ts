import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { getProductTeam, getProductTeamWorkload } from '@/lib/team-workload'
import { createTestProcess, createTestProduct, ensureTestUser } from './helpers'
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
        {
          title: 'A',
          status: 'PLANNED',
          visibility: 'INTERNAL',
          productId: product.id,
          ownerId: busy.id,
          userId: DEFAULT_USER_ID,
        },
        {
          title: 'B',
          status: 'IN_PROGRESS',
          visibility: 'INTERNAL',
          productId: product.id,
          ownerId: busy.id,
          userId: DEFAULT_USER_ID,
        },
        {
          title: 'C',
          status: 'SHIPPED',
          visibility: 'INTERNAL',
          productId: product.id,
          ownerId: busy.id,
          userId: DEFAULT_USER_ID,
        },
        {
          title: 'D',
          status: 'SHIPPED',
          visibility: 'INTERNAL',
          productId: product.id,
          ownerId: idle.id,
          userId: DEFAULT_USER_ID,
        },
        {
          title: 'E',
          status: 'PAUSED',
          visibility: 'INTERNAL',
          productId: product.id,
          ownerId: idle.id,
          userId: DEFAULT_USER_ID,
        },
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

  it('returns an empty array for a product with no roadmap items or process steps', async () => {
    const product = await createTestProduct()
    expect(await getProductTeamWorkload(DEFAULT_USER_ID, product.id)).toEqual([])
  })

  it('counts assigned process steps as active work, combined with roadmap items (Фаза 3)', async () => {
    const product = await createTestProduct()
    const person = await prisma.person.create({
      data: { name: 'Process Owner', skills: [], userId: DEFAULT_USER_ID },
    })
    await prisma.roadmapItem.create({
      data: {
        title: 'A',
        status: 'SHIPPED',
        visibility: 'INTERNAL',
        productId: product.id,
        ownerId: person.id,
        userId: DEFAULT_USER_ID,
      },
    })
    const process = await createTestProcess(product.id)
    await prisma.processStep.createMany({
      data: [
        { title: 'Step 1', x: 0, y: 0, processId: process.id, assignedPersonId: person.id },
        { title: 'Step 2', x: 100, y: 0, processId: process.id, assignedPersonId: person.id },
      ],
    })
    // Unassigned step shouldn't contribute to anyone's workload.
    await prisma.processStep.create({
      data: { title: 'Step 3', x: 200, y: 0, processId: process.id },
    })

    const result = await getProductTeamWorkload(DEFAULT_USER_ID, product.id)
    expect(result).toEqual([
      { person: expect.objectContaining({ id: person.id }), activeCount: 2, totalCount: 3 },
    ])
  })
})

describe('getProductTeam', () => {
  it('includes an explicitly rostered person with zero counts, not just derived workload', async () => {
    const product = await createTestProduct()
    const rostered = await prisma.person.create({
      data: { name: 'Just Joined', skills: [], userId: DEFAULT_USER_ID },
    })
    await prisma.productTeamMember.create({
      data: { productId: product.id, personId: rostered.id },
    })

    const result = await getProductTeam(DEFAULT_USER_ID, product.id)
    expect(result).toEqual([
      {
        person: expect.objectContaining({ id: rostered.id }),
        activeCount: 0,
        totalCount: 0,
        inRoster: true,
        membershipId: expect.any(String),
      },
    ])
  })

  it('merges roster membership with derived workload for the same person', async () => {
    const product = await createTestProduct()
    const person = await prisma.person.create({
      data: { name: 'Both', skills: [], userId: DEFAULT_USER_ID },
    })
    const membership = await prisma.productTeamMember.create({
      data: { productId: product.id, personId: person.id },
    })
    await prisma.roadmapItem.create({
      data: {
        title: 'A',
        status: 'PLANNED',
        visibility: 'INTERNAL',
        productId: product.id,
        ownerId: person.id,
        userId: DEFAULT_USER_ID,
      },
    })

    const result = await getProductTeam(DEFAULT_USER_ID, product.id)
    expect(result).toEqual([
      {
        person: expect.objectContaining({ id: person.id }),
        activeCount: 1,
        totalCount: 1,
        inRoster: true,
        membershipId: membership.id,
      },
    ])
  })

  it('includes a derived-only person (never rostered) with inRoster: false', async () => {
    const product = await createTestProduct()
    const person = await prisma.person.create({
      data: { name: 'Derived Only', skills: [], userId: DEFAULT_USER_ID },
    })
    await prisma.roadmapItem.create({
      data: {
        title: 'A',
        status: 'SHIPPED',
        visibility: 'INTERNAL',
        productId: product.id,
        ownerId: person.id,
        userId: DEFAULT_USER_ID,
      },
    })

    const result = await getProductTeam(DEFAULT_USER_ID, product.id)
    expect(result).toEqual([
      {
        person: expect.objectContaining({ id: person.id }),
        activeCount: 0,
        totalCount: 1,
        inRoster: false,
        membershipId: null,
      },
    ])
  })

  it('returns an empty array when nobody is rostered or has active work', async () => {
    const product = await createTestProduct()
    expect(await getProductTeam(DEFAULT_USER_ID, product.id)).toEqual([])
  })
})
