import { beforeEach, describe, expect, it } from 'vitest'
import {
  assignProductsToDepartment,
  createDepartment,
  deleteDepartment,
  updateDepartment,
  updateDepartmentField,
} from '@/lib/actions/departments'
import { prisma } from '@/lib/prisma'
import { buildFormData, captureRedirect, ensureTestUser } from '../helpers'
import { DEFAULT_USER_ID } from '@/lib/current-user'

beforeEach(ensureTestUser)

describe('createDepartment', () => {
  it('creates a department with a color and description', async () => {
    const formData = buildFormData({
      name: 'MFA-продукты',
      color: '#ff0000',
      description: 'Продукты многофакторной аутентификации',
    })

    const redirectPath = await captureRedirect(() => createDepartment(formData))
    const id = redirectPath.split('/').pop()!
    const department = await prisma.department.findUnique({ where: { id } })
    expect(department).toMatchObject({
      name: 'MFA-продукты',
      color: '#ff0000',
      description: 'Продукты многофакторной аутентификации',
    })
  })

  it('rejects a missing name', async () => {
    const formData = buildFormData({ name: '  ' })
    await expect(createDepartment(formData)).rejects.toThrow(/REDIRECT:\/departments\/new\?error=/)
  })
})

describe('updateDepartment / deleteDepartment', () => {
  it('updates a department', async () => {
    const department = await prisma.department.create({
      data: { name: 'Old', userId: DEFAULT_USER_ID },
    })
    const formData = buildFormData({ name: 'New' })
    await captureRedirect(() => updateDepartment(department.id, formData))
    expect((await prisma.department.findUnique({ where: { id: department.id } }))?.name).toBe('New')
  })

  it('deletes a department and unsets it on any product', async () => {
    const department = await prisma.department.create({
      data: { name: 'Del', userId: DEFAULT_USER_ID },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Product',
        slug: `product-${Date.now()}`,
        departmentId: department.id,
        userId: DEFAULT_USER_ID,
      },
    })

    const redirectPath = await captureRedirect(() => deleteDepartment(department.id))
    expect(redirectPath).toBe('/departments')
    expect(await prisma.department.findUnique({ where: { id: department.id } })).toBeNull()
    expect(
      (await prisma.product.findUnique({ where: { id: product.id } }))?.departmentId
    ).toBeNull()
  })
})

describe('assignProductsToDepartment', () => {
  it('moves several products (including ones already in another department) in one call', async () => {
    const target = await prisma.department.create({
      data: { name: 'Target', userId: DEFAULT_USER_ID },
    })
    const other = await prisma.department.create({
      data: { name: 'Other', userId: DEFAULT_USER_ID },
    })
    const stamp = Date.now()
    const unassigned = await prisma.product.create({
      data: { name: 'Unassigned Product', slug: `unassigned-${stamp}`, userId: DEFAULT_USER_ID },
    })
    const elsewhere = await prisma.product.create({
      data: {
        name: 'Elsewhere Product',
        slug: `elsewhere-${stamp}`,
        departmentId: other.id,
        userId: DEFAULT_USER_ID,
      },
    })

    const formData = buildFormData({}, { productIds: [unassigned.id, elsewhere.id] })
    const redirectPath = await captureRedirect(() =>
      assignProductsToDepartment(target.id, formData)
    )
    expect(redirectPath).toBe(`/departments/${target.id}`)

    expect((await prisma.product.findUnique({ where: { id: unassigned.id } }))?.departmentId).toBe(
      target.id
    )
    expect((await prisma.product.findUnique({ where: { id: elsewhere.id } }))?.departmentId).toBe(
      target.id
    )
  })

  it('is a no-op (still redirects) when no products are selected', async () => {
    const department = await prisma.department.create({
      data: { name: 'Empty Selection', userId: DEFAULT_USER_ID },
    })
    const formData = buildFormData({})
    const redirectPath = await captureRedirect(() =>
      assignProductsToDepartment(department.id, formData)
    )
    expect(redirectPath).toBe(`/departments/${department.id}`)
  })

  it('does not move a product belonging to a different user', async () => {
    const otherUser = await prisma.user.create({
      data: { email: `other-${Date.now()}@example.com`, passwordHash: 'x' },
    })
    const department = await prisma.department.create({
      data: { name: 'Mine', userId: DEFAULT_USER_ID },
    })
    const foreignProduct = await prisma.product.create({
      data: { name: 'Foreign', slug: `foreign-${Date.now()}`, userId: otherUser.id },
    })

    const formData = buildFormData({}, { productIds: [foreignProduct.id] })
    await captureRedirect(() => assignProductsToDepartment(department.id, formData))

    expect(
      (await prisma.product.findUnique({ where: { id: foreignProduct.id } }))?.departmentId
    ).toBeNull()
  })
})

describe('updateDepartmentField', () => {
  it('sets and clears the description field', async () => {
    const department = await prisma.department.create({
      data: { name: 'C', userId: DEFAULT_USER_ID },
    })

    let result = await updateDepartmentField(department.id, 'description', 'Описание')
    expect(result).toEqual({ ok: true })
    expect(
      (await prisma.department.findUnique({ where: { id: department.id } }))?.description
    ).toBe('Описание')

    result = await updateDepartmentField(department.id, 'description', '')
    expect(result).toEqual({ ok: true })
    expect(
      (await prisma.department.findUnique({ where: { id: department.id } }))?.description
    ).toBeNull()
  })

  it('rejects an empty name', async () => {
    const department = await prisma.department.create({
      data: { name: 'C', userId: DEFAULT_USER_ID },
    })
    const result = await updateDepartmentField(department.id, 'name', '   ')
    expect(result.ok).toBe(false)
  })
})
