'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { assertOwned, denyUnowned } from '@/lib/ownership'
import { optionalString, type InlineFieldResult } from '@/lib/validation'

const departmentSchema = z.object({
  name: z.string().trim().min(1, 'Название обязательно'),
  color: optionalString(),
  description: optionalString(),
})

function parseDepartmentForm(formData: FormData) {
  return departmentSchema.safeParse({
    name: formData.get('name'),
    color: formData.get('color'),
    description: formData.get('description'),
  })
}

export async function createDepartment(formData: FormData) {
  const parsed = parseDepartmentForm(formData)
  if (!parsed.success) {
    redirect(`/departments/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  const department = await prisma.department.create({
    data: { ...parsed.data, userId: getCurrentUserId() },
  })
  revalidatePath('/departments')
  redirect(`/departments/${department.id}`)
}

export async function updateDepartment(id: string, formData: FormData) {
  await assertOwned('department', id, getCurrentUserId())

  const parsed = parseDepartmentForm(formData)
  if (!parsed.success) {
    redirect(`/departments/${id}/edit?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  await prisma.department.update({ where: { id }, data: parsed.data })
  revalidatePath('/departments')
  revalidatePath(`/departments/${id}`)
  redirect(`/departments/${id}`)
}

// Bulk-assign several existing products to this department in one submission
// (plans/2.0-ux-improvement-plan.md, Фаза 4) — before this, moving 5 products
// under a newly created department meant visiting each product's own page
// one at a time. `productIds` is unchecked (plain string[] via
// `formData.getAll`), same as the checkbox-pill multiselect pattern already
// used by the onboarding wizard's segment/JTBD pickers, so no client JS is
// needed for the form itself.
export async function assignProductsToDepartment(departmentId: string, formData: FormData) {
  const productIds = formData.getAll('productIds').map(String).filter(Boolean)
  if (productIds.length > 0) {
    await prisma.product.updateMany({
      where: { id: { in: productIds }, userId: getCurrentUserId() },
      data: { departmentId },
    })
  }
  revalidatePath('/departments')
  revalidatePath(`/departments/${departmentId}`)
  revalidatePath('/products')
  redirect(`/departments/${departmentId}`)
}

export async function deleteDepartment(id: string) {
  await assertOwned('department', id, getCurrentUserId())

  await prisma.department.delete({ where: { id } })
  revalidatePath('/departments')
  revalidatePath('/products')
  redirect('/departments')
}

export async function updateDepartmentField(
  id: string,
  field: 'name' | 'color' | 'description',
  value: string
): Promise<InlineFieldResult> {
  const denied = await denyUnowned('department', id, getCurrentUserId())
  if (denied) return denied

  switch (field) {
    case 'name': {
      const name = value.trim()
      if (!name) return { ok: false, error: 'Название не может быть пустым' }
      await prisma.department.update({ where: { id }, data: { name } })
      break
    }
    case 'color':
      await prisma.department.update({ where: { id }, data: { color: value.trim() || '#3B82F6' } })
      break
    case 'description':
      await prisma.department.update({
        where: { id },
        data: { description: value.trim() || null },
      })
      break
  }
  revalidatePath('/departments')
  revalidatePath(`/departments/${id}`)
  return { ok: true }
}
