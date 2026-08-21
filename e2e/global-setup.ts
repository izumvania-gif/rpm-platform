import type { FullConfig } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { DEFAULT_USER_ID } from '../lib/current-user'

// `next dev` compiles each route on first visit, which can take several
// seconds per route the first time — enough to blow past normal action
// timeouts if a spec is the first to hit a heavy route (e.g. /jtbd/graph,
// which pulls in @xyflow/react). Warming every route once here, after the
// webServer is confirmed up, keeps that one-time cost out of the specs.
const ROUTES = [
  '/',
  '/products',
  '/products/new',
  '/segments',
  '/segments/new',
  '/research',
  '/jtbd',
  '/jtbd/new',
  '/jtbd/graph',
  '/hypotheses',
  '/hypotheses/new',
  '/conversations',
  '/conversations/new',
  '/competitors',
  '/competitors/new',
  '/features',
  '/features/new',
  '/marketing',
  '/marketing/new',
  '/insights',
  '/insights/new',
  '/reports',
  '/reports/gaps',
  '/reports/segments-jtbd',
  '/search',
  // 2.0 routes. These were missing until the Inbox (B1) landed, and their
  // absence was not harmless: /cpo, /marketing-hub, /people and /inbox are
  // among the heaviest pages in the app, so the spec that happened to visit
  // one first paid its whole compile cost inside a 30s test timeout. On a
  // loaded container that reliably failed both the first attempt and the
  // retry, which reads as a regression rather than as a cold cache.
  '/people',
  '/people/new',
  '/departments',
  '/departments/new',
  '/pm',
  '/cpo',
  '/public',
  '/marketing-hub',
  '/sales-hub',
  '/inbox',
  // Dynamic detail routes, warmed with an id that cannot exist. The page hits
  // notFound() straight away, but Next still compiles the segment — which is
  // the whole point, and the only way to warm a `[id]` route without knowing
  // an id.
  //
  // Their absence was the cause of a recurring flake: createProductViaUI()
  // lands on /products/[id], one of the heaviest pages in the app, and paid
  // its entire cold compile inside an 8s assertion. Whichever spec created a
  // product first lost that race — reliably when a spec ran alone, since every
  // `playwright test` invocation starts its own dev server and pays the
  // compile again.
  '/products/warmup-nonexistent',
  '/products/warmup-nonexistent/links',
  '/products/warmup-nonexistent/canvas',
  '/segments/warmup-nonexistent',
  '/jtbd/warmup-nonexistent',
  '/hypotheses/warmup-nonexistent',
  '/features/warmup-nonexistent',
  '/marketing/warmup-nonexistent',
  '/insights/warmup-nonexistent',
  '/research/warmup-nonexistent',
  '/conversations/warmup-nonexistent',
  '/competitors/warmup-nonexistent',
  '/people/warmup-nonexistent',
]

/**
 * Every record the app writes hangs off one hard-coded user (`DEFAULT_USER_ID`
 * in lib/current-user.ts), and nothing in the E2E suite creates it — the specs
 * drive the real UI, and the UI has no sign-up. Until now that row existed
 * only because whoever set the test database up happened to leave it there, so
 * a freshly created or truncated database failed every single spec with an
 * opaque `Foreign key constraint violated: Product_userId_fkey` from deep
 * inside a Server Action. Upserting it here makes the suite self-sufficient.
 */
async function ensureDefaultUser() {
  const prisma = new PrismaClient()
  try {
    await prisma.user.upsert({
      where: { id: DEFAULT_USER_ID },
      update: {},
      create: { id: DEFAULT_USER_ID, email: 'e2e@example.com', passwordHash: 'e2e-hash' },
    })
  } finally {
    await prisma.$disconnect()
  }
}

export default async function globalSetup(config: FullConfig) {
  await ensureDefaultUser()

  const baseURL = config.projects[0]?.use?.baseURL as string | undefined
  if (!baseURL) return

  for (const route of ROUTES) {
    try {
      await fetch(`${baseURL}${route}`)
    } catch {
      // Best-effort warmup — a route that fails to prefetch here will just
      // pay its compile cost inside the spec that first visits it instead.
    }
  }
}
