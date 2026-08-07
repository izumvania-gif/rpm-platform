import { beforeEach, describe, expect, it } from 'vitest'
import {
  createConversation,
  createConversationQuick,
  deleteConversation,
  toggleConversationPinned,
  updateConversation,
  updateConversationField,
} from '@/lib/actions/conversations'
import { prisma } from '@/lib/prisma'
import { buildFormData, captureRedirect, createTestProduct, ensureTestUser } from '../helpers'

beforeEach(ensureTestUser)

describe('createConversation', () => {
  it('creates a conversation with a transcript', async () => {
    const product = await createTestProduct()
    const formData = buildFormData({
      title: 'Call with customer A',
      transcript: 'Full transcript text...',
      date: '2026-02-01',
      tags: 'churn-risk',
      productId: product.id,
    })

    const redirectPath = await captureRedirect(() => createConversation(formData))
    const id = redirectPath.split('/').pop()!
    const conversation = await prisma.conversation.findUnique({ where: { id } })
    expect(conversation).toMatchObject({ title: 'Call with customer A', tags: ['churn-risk'] })
  })
})

describe('updateConversation / deleteConversation / toggleConversationPinned', () => {
  it('updates a conversation', async () => {
    const product = await createTestProduct()
    const conversation = await prisma.conversation.create({
      data: { title: 'Old', date: new Date(), productId: product.id, userId: product.userId },
    })
    const formData = buildFormData({ title: 'New', date: '2026-03-01', productId: product.id })
    await captureRedirect(() => updateConversation(conversation.id, formData))
    expect((await prisma.conversation.findUnique({ where: { id: conversation.id } }))?.title).toBe('New')
  })

  it('deletes a conversation', async () => {
    const product = await createTestProduct()
    const conversation = await prisma.conversation.create({
      data: { title: 'Del', date: new Date(), productId: product.id, userId: product.userId },
    })
    const redirectPath = await captureRedirect(() => deleteConversation(conversation.id))
    expect(redirectPath).toBe('/conversations')
    expect(await prisma.conversation.findUnique({ where: { id: conversation.id } })).toBeNull()
  })

  it('toggles pinned', async () => {
    const product = await createTestProduct()
    const conversation = await prisma.conversation.create({
      data: { title: 'Pin', date: new Date(), productId: product.id, userId: product.userId },
    })
    await toggleConversationPinned(conversation.id, true)
    expect((await prisma.conversation.findUnique({ where: { id: conversation.id } }))?.pinned).toBe(true)
  })
})

describe('createConversationQuick', () => {
  it('creates a conversation without a form', async () => {
    const product = await createTestProduct()
    const result = await createConversationQuick(product.id, 'Quick call')
    expect(result.ok).toBe(true)
  })

  it('rejects a missing title', async () => {
    const product = await createTestProduct()
    const result = await createConversationQuick(product.id, '')
    expect(result.ok).toBe(false)
  })
})

describe('updateConversationField', () => {
  it('clears the transcript when given an empty value', async () => {
    const product = await createTestProduct()
    const conversation = await prisma.conversation.create({
      data: {
        title: 'T',
        transcript: 'Something',
        date: new Date(),
        productId: product.id,
        userId: product.userId,
      },
    })
    const result = await updateConversationField(conversation.id, 'transcript', '   ')
    expect(result).toEqual({ ok: true })
    expect(
      (await prisma.conversation.findUnique({ where: { id: conversation.id } }))?.transcript
    ).toBeNull()
  })
})
