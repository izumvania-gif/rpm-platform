'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { assertOwned, denyUnowned } from '@/lib/ownership'
import { optionalString, toTagsArray, type InlineFieldResult } from '@/lib/validation'

const personSchema = z.object({
  name: z.string().trim().min(1, 'Имя обязательно'),
  role: optionalString(),
  team: optionalString(),
  email: optionalString(z.string().trim().email('Некорректный email')),
  avatarUrl: optionalString(),
  skills: optionalString(),
})

function parsePersonForm(formData: FormData) {
  return personSchema.safeParse({
    name: formData.get('name'),
    role: formData.get('role'),
    team: formData.get('team'),
    email: formData.get('email'),
    avatarUrl: formData.get('avatarUrl'),
    skills: formData.get('skills'),
  })
}

export async function createPerson(formData: FormData) {
  const parsed = parsePersonForm(formData)
  if (!parsed.success) {
    redirect(`/people/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  const { skills, ...data } = parsed.data
  const person = await prisma.person.create({
    data: { ...data, skills: toTagsArray(skills), userId: getCurrentUserId() },
  })
  revalidatePath('/people')
  redirect(`/people/${person.id}`)
}

export async function updatePerson(id: string, formData: FormData) {
  await assertOwned('person', id, getCurrentUserId())

  const parsed = parsePersonForm(formData)
  if (!parsed.success) {
    redirect(`/people/${id}/edit?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  const { skills, ...data } = parsed.data
  await prisma.person.update({
    where: { id },
    data: { ...data, skills: toTagsArray(skills) },
  })
  revalidatePath('/people')
  revalidatePath(`/people/${id}`)
  redirect(`/people/${id}`)
}

export async function deletePerson(id: string) {
  await assertOwned('person', id, getCurrentUserId())

  await prisma.person.delete({ where: { id } })
  revalidatePath('/people')
  redirect('/people')
}

export async function togglePersonPinned(id: string, pinned: boolean) {
  await assertOwned('person', id, getCurrentUserId())

  await prisma.person.update({ where: { id }, data: { pinned } })
  revalidatePath('/people')
  revalidatePath(`/people/${id}`)
}

export async function updatePersonField(
  id: string,
  field: 'name' | 'role' | 'team' | 'email' | 'avatarUrl' | 'skills',
  value: string
): Promise<InlineFieldResult> {
  const denied = await denyUnowned('person', id, getCurrentUserId())
  if (denied) return denied

  switch (field) {
    case 'name': {
      const name = value.trim()
      if (!name) return { ok: false, error: 'Имя не может быть пустым' }
      await prisma.person.update({ where: { id }, data: { name } })
      break
    }
    case 'role':
      await prisma.person.update({ where: { id }, data: { role: value.trim() || null } })
      break
    case 'team':
      await prisma.person.update({ where: { id }, data: { team: value.trim() || null } })
      break
    case 'email': {
      const email = value.trim()
      if (email && !z.string().email().safeParse(email).success) {
        return { ok: false, error: 'Некорректный email' }
      }
      await prisma.person.update({ where: { id }, data: { email: email || null } })
      break
    }
    case 'avatarUrl':
      await prisma.person.update({ where: { id }, data: { avatarUrl: value.trim() || null } })
      break
    case 'skills':
      await prisma.person.update({ where: { id }, data: { skills: toTagsArray(value) } })
      break
  }
  revalidatePath('/people')
  revalidatePath(`/people/${id}`)
  return { ok: true }
}
