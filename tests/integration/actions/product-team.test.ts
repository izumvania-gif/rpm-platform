import { beforeEach, describe, expect, it } from 'vitest'
import {
  addProductTeamMemberQuick,
  createPersonAndAddToTeamQuick,
  removeProductTeamMember,
} from '@/lib/actions/product-team'
import { prisma } from '@/lib/prisma'
import { createTestProduct, ensureTestUser, captureRedirect } from '../helpers'
import { DEFAULT_USER_ID } from '@/lib/current-user'

beforeEach(ensureTestUser)

describe('addProductTeamMemberQuick', () => {
  it('adds an existing person to the product roster', async () => {
    const product = await createTestProduct()
    const person = await prisma.person.create({
      data: { name: 'Carol PM', skills: [], userId: DEFAULT_USER_ID },
    })

    const result = await addProductTeamMemberQuick(product.id, person.id)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.member.person).toMatchObject({ id: person.id, name: 'Carol PM' })

    const stored = await prisma.productTeamMember.findMany({ where: { productId: product.id } })
    expect(stored).toHaveLength(1)
  })

  it('rejects a missing person', async () => {
    const product = await createTestProduct()
    const result = await addProductTeamMemberQuick(product.id, '')
    expect(result.ok).toBe(false)
  })

  it('rejects adding the same person to the same product twice', async () => {
    const product = await createTestProduct()
    const person = await prisma.person.create({
      data: { name: 'Dana', skills: [], userId: DEFAULT_USER_ID },
    })
    await addProductTeamMemberQuick(product.id, person.id)

    const result = await addProductTeamMemberQuick(product.id, person.id)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/уже в команде/)
  })
})

describe('createPersonAndAddToTeamQuick', () => {
  it('creates a new person and adds them to the roster in one step', async () => {
    const product = await createTestProduct()

    const result = await createPersonAndAddToTeamQuick(product.id, 'New Hire', 'Аналитик')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.member.person).toMatchObject({ name: 'New Hire', role: 'Аналитик' })

    const person = await prisma.person.findUnique({ where: { id: result.member.person.id } })
    expect(person?.userId).toBe(DEFAULT_USER_ID)
    const stored = await prisma.productTeamMember.findMany({ where: { productId: product.id } })
    expect(stored).toHaveLength(1)
  })

  it('rejects a missing name', async () => {
    const product = await createTestProduct()
    const result = await createPersonAndAddToTeamQuick(product.id, '   ', '')
    expect(result.ok).toBe(false)
  })
})

describe('removeProductTeamMember', () => {
  it('removes the membership but keeps the Person record, redirecting back to /pm', async () => {
    const product = await createTestProduct()
    const person = await prisma.person.create({
      data: { name: 'Erin', skills: [], userId: DEFAULT_USER_ID },
    })
    const added = await addProductTeamMemberQuick(product.id, person.id)
    if (!added.ok) throw new Error('setup failed')

    const redirectPath = await captureRedirect(() => removeProductTeamMember(added.member.id))
    expect(redirectPath).toBe(`/pm/team?productId=${product.id}`)

    expect(await prisma.productTeamMember.count()).toBe(0)
    expect(await prisma.person.findUnique({ where: { id: person.id } })).not.toBeNull()
  })
})
