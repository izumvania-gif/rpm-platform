import type { FullConfig } from '@playwright/test'

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
]

export default async function globalSetup(config: FullConfig) {
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
