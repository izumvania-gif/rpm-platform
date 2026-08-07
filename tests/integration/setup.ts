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
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
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
