import { beforeEach, describe, expect, it } from 'vitest'
import {
  createProductResource,
  deleteProductResource,
  updateProductResource,
} from '@/lib/actions/product-resources'
import { prisma } from '@/lib/prisma'
import { buildFormData, captureRedirect, createTestProduct, ensureTestUser } from '../helpers'

beforeEach(ensureTestUser)

describe('createProductResource', () => {
  it('creates a resource and redirects back to the product page', async () => {
    const product = await createTestProduct()
    const formData = buildFormData({
      title: 'Sales kit',
      kind: 'SALES_KIT',
      url: 'https://example.com/sales-kit',
      productId: product.id,
    })

    const redirectPath = await captureRedirect(() => createProductResource(formData))
    expect(redirectPath).toBe(`/products/${product.id}`)
    expect(await prisma.productResource.count({ where: { productId: product.id } })).toBe(1)
  })

  it('rejects an invalid kind', async () => {
    const product = await createTestProduct()
    const formData = buildFormData({ title: 'Bad', kind: 'NOT_A_KIND', productId: product.id })
    const redirectPath = await captureRedirect(() => createProductResource(formData))
    expect(redirectPath).toMatch(/^\/resources\/new\?error=/)
  })
})

describe('updateProductResource / deleteProductResource', () => {
  it('updates a resource', async () => {
    const product = await createTestProduct()
    const resource = await prisma.productResource.create({
      data: { title: 'Old', kind: 'DEVELOPER_DOC', productId: product.id, userId: product.userId },
    })
    const formData = buildFormData({ title: 'New', kind: 'DEVELOPER_DOC', productId: product.id })
    const redirectPath = await captureRedirect(() => updateProductResource(resource.id, formData))
    expect(redirectPath).toBe(`/products/${product.id}`)
    expect((await prisma.productResource.findUnique({ where: { id: resource.id } }))?.title).toBe(
      'New'
    )
  })

  it('deletes a resource', async () => {
    const product = await createTestProduct()
    const resource = await prisma.productResource.create({
      data: { title: 'Del', kind: 'OTHER', productId: product.id, userId: product.userId },
    })
    const redirectPath = await captureRedirect(() => deleteProductResource(resource.id))
    expect(redirectPath).toBe(`/products/${product.id}`)
    expect(await prisma.productResource.findUnique({ where: { id: resource.id } })).toBeNull()
  })
})
