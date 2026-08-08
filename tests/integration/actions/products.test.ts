import { beforeEach, describe, expect, it } from 'vitest'
import { createProduct, deleteProduct, updateProduct, updateProductField } from '@/lib/actions/products'
import { prisma } from '@/lib/prisma'
import { DEFAULT_USER_ID } from '@/lib/current-user'
import { buildFormData, captureRedirect, ensureTestUser } from '../helpers'

beforeEach(ensureTestUser)

describe('createProduct', () => {
  it('creates a product and redirects to its detail page', async () => {
    const formData = buildFormData({
      name: 'RPM Platform',
      slug: 'rpm-platform',
      description: 'A product discovery tool',
      stage: 'MVP',
    })

    const redirectPath = await captureRedirect(() => createProduct(formData))
    const id = redirectPath.split('/').pop()!

    const product = await prisma.product.findUnique({ where: { id } })
    expect(product).toMatchObject({
      name: 'RPM Platform',
      slug: 'rpm-platform',
      stage: 'MVP',
      userId: DEFAULT_USER_ID,
    })
  })

  it('creates a product with an owner and a public summary (2.0)', async () => {
    const owner = await prisma.person.create({
      data: { name: 'Alice PM', skills: [], userId: DEFAULT_USER_ID },
    })
    const formData = buildFormData({
      name: 'Owned Product',
      slug: 'owned-product',
      stage: 'MVP',
      ownerId: owner.id,
      publicSummary: 'Helps clients do X.',
    })

    const redirectPath = await captureRedirect(() => createProduct(formData))
    const id = redirectPath.split('/').pop()!
    const product = await prisma.product.findUnique({ where: { id } })
    expect(product).toMatchObject({ ownerId: owner.id, publicSummary: 'Helps clients do X.' })
  })

  it('sends the onboarding-mode flag to the onboarding wizard instead', async () => {
    const formData = buildFormData({
      name: 'Onboarded Product',
      slug: 'onboarded-product',
      stage: 'IDEA',
      mode: 'onboarding',
    })

    const redirectPath = await captureRedirect(() => createProduct(formData))
    expect(redirectPath).toMatch(/\/onboarding\/segments$/)
  })

  it('rejects an invalid slug without touching the database', async () => {
    const formData = buildFormData({ name: 'Bad Slug', slug: 'Not A Valid Slug!', stage: 'IDEA' })

    const redirectPath = await captureRedirect(() => createProduct(formData))
    expect(redirectPath).toMatch(/^\/products\/new\?error=/)
    expect(await prisma.product.count()).toBe(0)
  })

  it('rejects a duplicate slug', async () => {
    await prisma.product.create({
      data: { name: 'First', slug: 'dup-slug', userId: DEFAULT_USER_ID },
    })

    const formData = buildFormData({ name: 'Second', slug: 'dup-slug', stage: 'IDEA' })
    const redirectPath = await captureRedirect(() => createProduct(formData))
    expect(redirectPath).toMatch(/^\/products\/new\?error=/)
    expect(await prisma.product.count()).toBe(1)
  })
})

describe('updateProduct', () => {
  it('updates fields and redirects to the detail page', async () => {
    const product = await prisma.product.create({
      data: { name: 'Old Name', slug: 'old-name', userId: DEFAULT_USER_ID },
    })

    const formData = buildFormData({ name: 'New Name', slug: 'old-name', stage: 'GROWTH' })
    const redirectPath = await captureRedirect(() => updateProduct(product.id, formData))
    expect(redirectPath).toBe(`/products/${product.id}`)

    const updated = await prisma.product.findUnique({ where: { id: product.id } })
    expect(updated).toMatchObject({ name: 'New Name', stage: 'GROWTH' })
  })
})

describe('deleteProduct', () => {
  it('deletes the product and redirects to the list', async () => {
    const product = await prisma.product.create({
      data: { name: 'To Delete', slug: 'to-delete', userId: DEFAULT_USER_ID },
    })

    const redirectPath = await captureRedirect(() => deleteProduct(product.id))
    expect(redirectPath).toBe('/products')
    expect(await prisma.product.findUnique({ where: { id: product.id } })).toBeNull()
  })
})

describe('updateProductField', () => {
  it('updates name inline', async () => {
    const product = await prisma.product.create({
      data: { name: 'Old', slug: 'inline-name', userId: DEFAULT_USER_ID },
    })

    const result = await updateProductField(product.id, 'name', 'Renamed')
    expect(result).toEqual({ ok: true })
    expect((await prisma.product.findUnique({ where: { id: product.id } }))?.name).toBe('Renamed')
  })

  it('rejects an empty name inline', async () => {
    const product = await prisma.product.create({
      data: { name: 'Old', slug: 'inline-empty', userId: DEFAULT_USER_ID },
    })

    const result = await updateProductField(product.id, 'name', '   ')
    expect(result.ok).toBe(false)
  })

  it('rejects an invalid stage value', async () => {
    const product = await prisma.product.create({
      data: { name: 'Old', slug: 'inline-stage', userId: DEFAULT_USER_ID },
    })

    const result = await updateProductField(product.id, 'stage', 'NOT_A_STAGE')
    expect(result.ok).toBe(false)
  })

  it('sets and clears ownerId inline (2.0)', async () => {
    const owner = await prisma.person.create({
      data: { name: 'Bob PM', skills: [], userId: DEFAULT_USER_ID },
    })
    const product = await prisma.product.create({
      data: { name: 'Old', slug: 'inline-owner', userId: DEFAULT_USER_ID },
    })

    let result = await updateProductField(product.id, 'ownerId', owner.id)
    expect(result).toEqual({ ok: true })
    expect((await prisma.product.findUnique({ where: { id: product.id } }))?.ownerId).toBe(
      owner.id
    )

    result = await updateProductField(product.id, 'ownerId', '')
    expect(result).toEqual({ ok: true })
    expect((await prisma.product.findUnique({ where: { id: product.id } }))?.ownerId).toBeNull()
  })

  it('sets publicSummary inline (2.0)', async () => {
    const product = await prisma.product.create({
      data: { name: 'Old', slug: 'inline-summary', userId: DEFAULT_USER_ID },
    })

    const result = await updateProductField(product.id, 'publicSummary', 'Public pitch')
    expect(result).toEqual({ ok: true })
    expect(
      (await prisma.product.findUnique({ where: { id: product.id } }))?.publicSummary
    ).toBe('Public pitch')
  })
})
