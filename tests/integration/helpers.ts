import { prisma } from '@/lib/prisma'
import { DEFAULT_USER_ID } from '@/lib/current-user'

export function buildFormData(
  fields: Record<string, string | undefined>,
  multi: Record<string, string[]> = {}
): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) fd.set(key, value)
  }
  for (const [key, values] of Object.entries(multi)) {
    for (const value of values) fd.append(key, value)
  }
  return fd
}

/**
 * Server Actions redirect() on success (mocked in setup.ts to throw
 * `REDIRECT:<path>` instead of actually redirecting). This runs the action,
 * asserts it took the redirect branch, and returns the target path so tests
 * can extract IDs and assert DB state.
 */
export async function captureRedirect(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn()
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('REDIRECT:')) {
      return e.message.slice('REDIRECT:'.length)
    }
    throw e
  }
  throw new Error('Expected the action to redirect, but it returned normally')
}

// Every test starts with a truncated DB (setup.ts), so this must run fresh
// each time rather than caching whether it "already ran" in this process.
export async function ensureTestUser() {
  await prisma.user.upsert({
    where: { id: DEFAULT_USER_ID },
    update: {},
    create: { id: DEFAULT_USER_ID, email: 'test@example.com', passwordHash: 'test-hash' },
  })
}

export async function createTestProduct(overrides: { name?: string; slug?: string } = {}) {
  await ensureTestUser()
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return prisma.product.create({
    data: {
      name: overrides.name ?? 'Test Product',
      slug: overrides.slug ?? `test-product-${suffix}`,
      userId: DEFAULT_USER_ID,
    },
  })
}

export async function createTestProcess(productId: string, overrides: { title?: string } = {}) {
  return prisma.process.create({
    data: { title: overrides.title ?? 'Test Process', productId },
  })
}
