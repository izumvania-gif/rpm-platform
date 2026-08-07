'use server'

import { z } from 'zod'
import { Prisma, Stage } from '@prisma/client'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import type { InlineFieldResult } from '@/lib/validation'

const productSchema = z.object({
  name: z.string().trim().min(1, 'Название обязательно'),
  slug: z
    .string()
    .trim()
    .min(1, 'Slug обязателен')
    .regex(/^[a-z0-9-]+$/, 'Slug: только латиница, цифры и дефис'),
  description: z.string().trim().optional(),
  stage: z.nativeEnum(Stage),
})

function parseProductForm(formData: FormData) {
  return productSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    description: formData.get('description') || undefined,
    stage: formData.get('stage'),
  })
}

export async function createProduct(formData: FormData) {
  const parsed = parseProductForm(formData)
  if (!parsed.success) {
    redirect(`/products/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  const onboarding = formData.get('mode') === 'onboarding'

  try {
    const product = await prisma.product.create({
      data: { ...parsed.data, userId: getCurrentUserId() },
    })
    revalidatePath('/products')
    redirect(onboarding ? `/products/${product.id}/onboarding/segments` : `/products/${product.id}`)
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      redirect(`/products/new?error=${encodeURIComponent('Продукт с таким slug уже существует')}`)
    }
    throw e
  }
}

export async function updateProduct(id: string, formData: FormData) {
  const parsed = parseProductForm(formData)
  if (!parsed.success) {
    redirect(`/products/${id}/edit?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  try {
    await prisma.product.update({
      where: { id },
      data: parsed.data,
    })
    revalidatePath('/products')
    revalidatePath(`/products/${id}`)
    redirect(`/products/${id}`)
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      redirect(
        `/products/${id}/edit?error=${encodeURIComponent('Продукт с таким slug уже существует')}`
      )
    }
    throw e
  }
}

export async function deleteProduct(id: string) {
  await prisma.product.delete({ where: { id } })
  revalidatePath('/products')
  redirect('/products')
}

export async function updateProductField(
  id: string,
  field: 'name' | 'description' | 'stage',
  value: string
): Promise<InlineFieldResult> {
  switch (field) {
    case 'name': {
      const name = value.trim()
      if (!name) return { ok: false, error: 'Название не может быть пустым' }
      await prisma.product.update({ where: { id }, data: { name } })
      break
    }
    case 'description':
      await prisma.product.update({ where: { id }, data: { description: value.trim() || null } })
      break
    case 'stage':
      if (!Object.values(Stage).includes(value as Stage)) {
        return { ok: false, error: 'Некорректная стадия' }
      }
      await prisma.product.update({ where: { id }, data: { stage: value as Stage } })
      break
  }
  revalidatePath('/products')
  revalidatePath(`/products/${id}`)
  return { ok: true }
}
