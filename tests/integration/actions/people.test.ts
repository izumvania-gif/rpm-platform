import { beforeEach, describe, expect, it } from 'vitest'
import {
  createPerson,
  deletePerson,
  togglePersonPinned,
  updatePerson,
  updatePersonField,
} from '@/lib/actions/people'
import { prisma } from '@/lib/prisma'
import { buildFormData, captureRedirect, ensureTestUser } from '../helpers'
import { DEFAULT_USER_ID } from '@/lib/current-user'

beforeEach(ensureTestUser)

describe('createPerson', () => {
  it('creates a person with a skills list and extra attributes', async () => {
    const formData = buildFormData({
      name: 'Alice PM',
      role: 'Продакт-менеджер',
      team: 'Продукт',
      email: 'alice@example.com',
      skills: 'discovery, roadmapping',
    })

    const redirectPath = await captureRedirect(() => createPerson(formData))
    const id = redirectPath.split('/').pop()!
    const person = await prisma.person.findUnique({ where: { id } })
    expect(person).toMatchObject({
      name: 'Alice PM',
      role: 'Продакт-менеджер',
      team: 'Продукт',
      email: 'alice@example.com',
      skills: ['discovery', 'roadmapping'],
    })
  })

  it('rejects a missing name', async () => {
    const formData = buildFormData({ name: '  ' })
    await expect(createPerson(formData)).rejects.toThrow(/REDIRECT:\/people\/new\?error=/)
  })

  it('rejects an invalid email', async () => {
    const formData = buildFormData({ name: 'Bob', email: 'not-an-email' })
    await expect(createPerson(formData)).rejects.toThrow(/REDIRECT:\/people\/new\?error=/)
  })
})

describe('updatePerson / deletePerson / togglePersonPinned', () => {
  it('updates a person', async () => {
    await ensureTestUser()
    const person = await prisma.person.create({
      data: { name: 'Old', skills: [], userId: DEFAULT_USER_ID },
    })
    const formData = buildFormData({ name: 'New' })
    await captureRedirect(() => updatePerson(person.id, formData))
    expect((await prisma.person.findUnique({ where: { id: person.id } }))?.name).toBe('New')
  })

  it('deletes a person', async () => {
    await ensureTestUser()
    const person = await prisma.person.create({
      data: { name: 'Del', skills: [], userId: DEFAULT_USER_ID },
    })
    const redirectPath = await captureRedirect(() => deletePerson(person.id))
    expect(redirectPath).toBe('/people')
    expect(await prisma.person.findUnique({ where: { id: person.id } })).toBeNull()
  })

  it('toggles pinned', async () => {
    await ensureTestUser()
    const person = await prisma.person.create({
      data: { name: 'Pin', skills: [], userId: DEFAULT_USER_ID },
    })
    await togglePersonPinned(person.id, true)
    expect((await prisma.person.findUnique({ where: { id: person.id } }))?.pinned).toBe(true)
  })
})

describe('updatePersonField', () => {
  it('sets and clears the role field', async () => {
    await ensureTestUser()
    const person = await prisma.person.create({
      data: { name: 'C', skills: [], userId: DEFAULT_USER_ID },
    })

    let result = await updatePersonField(person.id, 'role', 'Маркетинг-лид')
    expect(result).toEqual({ ok: true })
    expect((await prisma.person.findUnique({ where: { id: person.id } }))?.role).toBe(
      'Маркетинг-лид'
    )

    result = await updatePersonField(person.id, 'role', '')
    expect(result).toEqual({ ok: true })
    expect((await prisma.person.findUnique({ where: { id: person.id } }))?.role).toBeNull()
  })

  it('rejects an empty name', async () => {
    await ensureTestUser()
    const person = await prisma.person.create({
      data: { name: 'C', skills: [], userId: DEFAULT_USER_ID },
    })
    const result = await updatePersonField(person.id, 'name', '   ')
    expect(result.ok).toBe(false)
  })

  it('rejects an invalid email', async () => {
    await ensureTestUser()
    const person = await prisma.person.create({
      data: { name: 'C', skills: [], userId: DEFAULT_USER_ID },
    })
    const result = await updatePersonField(person.id, 'email', 'not-an-email')
    expect(result.ok).toBe(false)
  })
})
