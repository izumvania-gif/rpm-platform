'use server'

import { z } from 'zod'
import { ProductResourceKind } from '@prisma/client'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { optionalString } from '@/lib/validation'

const productResourceSchema = z.object({
  title: z.string().trim().min(1, 'Название обязательно'),
  kind: z.nativeEnum(ProductResourceKind),
  url: optionalString(),
  description: optionalString(),
  productId: z.string().trim().min(1, 'Продукт обязателен'),
})

function parseProductResourceForm(formData: FormData) {
  return productResourceSchema.safeParse({
    title: formData.get('title'),
    kind: formData.get('kind'),
    url: formData.get('url'),
    description: formData.get('description'),
    productId: formData.get('productId'),
  })
}

export async function createProductResource(formData: FormData) {
  const parsed = parseProductResourceForm(formData)
  if (!parsed.success) {
    redirect(`/resources/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  const resource = await prisma.productResource.create({
    data: { ...parsed.data, userId: getCurrentUserId() },
  })
  revalidatePath(`/products/${resource.productId}`)
  redirect(`/products/${resource.productId}`)
}

export async function updateProductResource(id: string, formData: FormData) {
  const parsed = parseProductResourceForm(formData)
  if (!parsed.success) {
    redirect(`/resources/${id}/edit?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  const resource = await prisma.productResource.update({
    where: { id },
    data: parsed.data,
  })
  revalidatePath(`/products/${resource.productId}`)
  redirect(`/products/${resource.productId}`)
}

export async function deleteProductResource(id: string) {
  const resource = await prisma.productResource.delete({ where: { id } })
  revalidatePath(`/products/${resource.productId}`)
  redirect(`/products/${resource.productId}`)
}
