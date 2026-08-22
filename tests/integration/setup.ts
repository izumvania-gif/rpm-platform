import { config } from 'dotenv'
import { beforeEach, vi } from 'vitest'

// .env.test must win over the root .env's dev-database DATABASE_URL — dotenv's
// default `override: false` would otherwise silently keep the dev DB's value
// since .env is also auto-loaded by tooling in this repo (Prisma's own
// convention). `override: true` here is load-bearing: without it, these tests
// truncate the real dev database instead of the throwaway test one. In CI,
// .env.test doesn't exist, so this is a no-op and DATABASE_URL comes from the
// workflow's Postgres service container env instead.
config({ path: '.env.test', override: true })

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. Copy .env.test.example to .env.test and point it at a ' +
      'throwaway Postgres database, or set DATABASE_URL directly (as CI does).'
  )
}

if (!/rpm_platform_test|test/i.test(process.env.DATABASE_URL)) {
  throw new Error(
    `DATABASE_URL ("${process.env.DATABASE_URL}") doesn't look like a test database ` +
      '(expected "test" in the name). Refusing to run — these tests truncate every table.'
  )
}

// Server Actions call these two Next.js runtime APIs unconditionally. Outside
// an actual Next.js request (i.e. here, calling the action function directly
// from a test), there's no router to redirect through and no cache to
// revalidate — so both are mocked. `redirect()` throws, mirroring how it
// behaves for real (Next.js implements redirect via a thrown, framework-caught
// signal), letting tests assert on the intended destination with
// `captureRedirect` (tests/integration/helpers.ts) while still exercising the
// actual DB write that happens before the redirect call.
// `cookies()` from next/headers has the same problem as redirect/revalidatePath:
// it needs a live request context, and there is none when an action is called
// directly from a test. Since фаза 4 the product actions set the active-product
// cookie, so a stub is required — an in-memory store rather than a no-op, so a
// test can still assert what the action wrote if it ever needs to.
const cookieStore = new Map<string, string>()

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) => {
      const value = cookieStore.get(name)
      return value === undefined ? undefined : { name, value }
    },
    set: (name: string, value: string) => {
      cookieStore.set(name, value)
    },
    delete: (name: string) => {
      cookieStore.delete(name)
    },
  }),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
  // The ownership guard (lib/ownership.ts) raises a 404 for redirect-style
  // actions, so it needs the same treatment as redirect: a catchable signal
  // instead of a real framework throw. See captureNotFound in helpers.ts.
  notFound: vi.fn(() => {
    throw new Error('NOT_FOUND')
  }),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

import { prisma } from '@/lib/prisma'

async function resetDatabase() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != '_prisma_migrations'
  `
  if (tables.length === 0) return
  const names = tables.map((t) => `"${t.tablename}"`).join(', ')
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`)
}

beforeEach(resetDatabase)
