'use server'

import { z } from 'zod'
import { Prisma, Stage } from '@prisma/client'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { optionalString, type InlineFieldResult } from '@/lib/validation'

const productSchema = z.object({
  name: z.string().trim().min(1, 'Название обязательно'),
  slug: z
    .string()
    .trim()
    .min(1, 'Slug обязателен')
    .regex(/^[a-z0-9-]+$/, 'Slug: только латиница, цифры и дефис'),
  description: z.string().trim().optional(),
  stage: z.nativeEnum(Stage),
  // 2.0 (plans/platform-views-plan.md §1) — same optional-relation pattern
  // already used by Hypothesis.jtbdId/segmentId/researchId: an empty select
  // preprocesses to undefined, which Prisma treats as "don't touch this
  // field" on update, not "clear it" (only an explicit null clears a
  // nullable relation) — picking "Не указан" again after a value was set
  // won't unset it. Pre-existing limitation of this pattern, not new here.
  ownerId: optionalString(),
  publicSummary: optionalString(),
  // §10: same optional-relation pattern as ownerId above.
  departmentId: optionalString(),
})

function parseProductForm(formData: FormData) {
  return productSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    description: formData.get('description') || undefined,
    stage: formData.get('stage'),
    ownerId: formData.get('ownerId'),
    publicSummary: formData.get('publicSummary'),
    departmentId: formData.get('departmentId'),
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
  field: 'name' | 'description' | 'stage' | 'ownerId' | 'publicSummary' | 'departmentId',
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
    case 'ownerId':
      // Inline field can explicitly clear the relation (unlike the full
      // edit form's <select>, see the schema comment above) — '' -> null.
      await prisma.product.update({ where: { id }, data: { ownerId: value.trim() || null } })
      break
    case 'publicSummary':
      await prisma.product.update({
        where: { id },
        data: { publicSummary: value.trim() || null },
      })
      break
    case 'departmentId':
      await prisma.product.update({ where: { id }, data: { departmentId: value.trim() || null } })
      break
  }
  revalidatePath('/products')
  revalidatePath(`/products/${id}`)
  return { ok: true }
}

// Product list for the global quick-capture overlay (plans/2.0-product-leap-plan.md,
// A3). Fetched lazily on first open rather than passed down from the root
// layout — the overlay is mounted on every page, and every page in this app
// is force-dynamic, so eager fetching would add a query to every navigation
// for a feature most page views never use.
export async function listProductsForCapture(): Promise<{ id: string; name: string }[]> {
  return prisma.product.findMany({
    where: { userId: getCurrentUserId() },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })
}
