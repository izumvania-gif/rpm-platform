import { beforeEach, describe, expect, it } from 'vitest'
import {
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
