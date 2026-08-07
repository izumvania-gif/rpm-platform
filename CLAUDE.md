# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**RPM Platform** (renamed from "ECHO Platform" on 2026-08-06; repo name `rpm-platform` already matched the new name — rename applied across UI and code, see `plans/growth-plan.md` §2.0 "Ребрендинг") — a product discovery / research management tool for product managers. Core loop: research repository → customer segments → JTBD (with a hierarchy + sequence graph canvas) → hypotheses (kanban board) → CustDev conversations, plus a product-positioning layer (competitors, features, RTB/"Маркетинг"). Most of this is now built, not planned — see `plans/growth-plan.md` §"Текущее состояние" for what actually exists today and §"План развития" for what's next (AI features remain unbuilt/future). See `ECHO_functional_requirements.md` for the original full product spec (still under its original working title) and `plans/mvp-development-plan.md` for the historical phased MVP build-out record. Product-facing text (UI copy, docs) is in Russian; code, identifiers, and comments are in English. **End-user documentation** (Russian, written from a working PM's perspective — daily workflow, step-by-step scenarios, field/relationship reference, recommendations and known limitations) lives in `docs/user-guide/` — update it alongside `plans/growth-plan.md` when a change affects what a user sees or does, not just what's built.

**Information architecture:** top nav (`components/shared/site-nav.tsx`) is 5 main tabs — Продукты, Сегменты, Исследования, Маркетинг (renamed from RTB; route is `/marketing`, the Prisma model is still called `RTB`), JTBD. Продукты and Исследования have a hover/focus dropdown sub-menu (Фичи; Гипотезы + Разговоры + Инсайты respectively). Competitors has no nav entry at all — `/competitors` still exists as a route but is only linked from within a product's detail page, never from top nav. JTBD has its own tab (not nested under anything) with an in-page "Список"/"Граф" tab switcher (`components/shared/jtbd-view-tabs.tsx`) between the plain list and the graph canvas. A GET-form search box lives in `SiteNav` itself (`/search?q=`, plain `contains`-based Prisma queries across all 11 content models, no full-text search infra). Read-only analytical pages live outside the CRUD-module URL convention, under `/reports` (`/reports`, `/reports/segments-jtbd`, `/reports/gaps`) — kept separate from `/insights`, which is the actual `Insight` CRUD module, to avoid the two colliding in the URL space.

## Commands

```bash
npm run dev           # dev server (http://localhost:3000)
npm run build          # production build
npm run start           # run production build
npm run lint            # next lint (ESLint)
npm run format           # prettier --write on ts/tsx/js/jsx/json/css/md

npm run db:push          # push Prisma schema to DB (no migration file) — used in dev
npm run db:migrate       # create + apply a Prisma migration
npm run db:generate      # regenerate Prisma Client (run after editing schema.prisma)
npm run db:studio        # Prisma Studio GUI
```

There is no test suite configured yet. Requires a running PostgreSQL 15+ instance and `DATABASE_URL` set (copy `.env.example` to `.env.local`).

## Architecture

- **Next.js 14 App Router, fullstack monolith.** UI and API both live under `app/`; API routes are Next.js Route Handlers (e.g. `app/api/auth/[...nextauth]/route.ts`). There is no separate backend service in the current MVP scope (a Python/FastAPI AI service is planned for a later phase per `plans/mvp-development-plan.md` but does not exist yet).
- **Data layer:** Prisma ORM against PostgreSQL, schema in `prisma/schema.prisma`. Eleven content models today — `Product`, `Research`, `Segment`, `JTBD` (+ `JtbdSequenceEdge` for the graph), `Hypothesis` (+ `HypothesisStatusChange`), `Conversation`, `Competitor`, `ProductResource`, `Feature`, `RTB`, `Insight` (atomic quotes/conclusions, optionally linked to a segment/JTBD/research/conversation) — each scoped to a `userId` (single-tenant MVP — no workspace/org model yet, `where: { userId }` is repeated by hand in every query, not enforced by a shared layer). Import the shared client from `lib/prisma.ts` (`prisma` singleton guarded against hot-reload duplication) rather than instantiating `PrismaClient` directly. After changing `schema.prisma`, run `npm run db:generate` (and `db:push` or `db:migrate` to sync the DB).
- **Auth:** NextAuth.js with the Credentials provider (email + bcrypt-hashed password), JWT session strategy, configured in `lib/auth.ts` and mounted at `app/api/auth/[...nextauth]/route.ts`. Session/User/JWT types are augmented in `types/next-auth.d.ts` to carry `id` through `session.user.id` and the JWT token. In practice all data is currently read/written under one hardcoded `DEFAULT_USER_ID` (`lib/current-user.ts`) — the login flow exists but multi-user isolation hasn't been exercised.
- **UI components:** shadcn/ui, configured via `components.json` (style: default, baseColor: slate, CSS variables). `components/ui` holds shadcn primitives; `components/forms`, `components/shared`, `components/jtbd-graph`, `components/hypotheses` hold feature components. `lib/utils.ts` provides the standard shadcn `cn()` helper (clsx + tailwind-merge). Theme is a red/white "Rutoken corporate" palette driven by CSS variables in `app/globals.css` (light + dark), including `lib/jtbd-job-types.ts`'s job-type colors (`--jtbd-*` variables, both theme variants).
- **Path aliases:** `@/*` maps to the repo root (see `tsconfig.json`), e.g. `@/lib/prisma`, `@/components/...`.
- **Mutation pattern:** most create/update actions in `lib/actions/*.ts` are Server Actions that `redirect()` on success. Anywhere the UI must stay on the current page (inline-create pickers, the JTBD graph canvas, the hypothesis kanban board, the product onboarding wizard), there's a second non-redirecting variant — `createXQuick(...)` — returning `{ ok: true, data } | { ok: false, error }`, paired with `useTransition` on the client (state is appended locally rather than via `router.refresh()`, in the wizard's case). All 9 content models now have one. Don't export plain data/option arrays from a `'use client'` file for a Server Component to consume — Next.js treats every export from a client-boundary file as an opaque client reference even for non-component data, which crashes at runtime; pass such arrays down as props from the server page instead (this has bitten the codebase twice).
- **Onboarding wizard:** `/products/[id]/onboarding/{segments,jtbd,research,hypotheses,competitors,features}` + `/done`, triggered by an explicit choice on the product-creation form (`ProductForm`'s `showOnboardingOption`, two submit buttons sharing one `name="mode"` field — no JS). Shared shell in `components/onboarding/wizard-shell.tsx` + `wizard-steps.ts`; each step is read-only/append-only (no inline delete — every existing `delete*` action redirects, which would break the wizard's stay-on-page flow). See `plans/growth-plan.md` §2.6 for the full design and the trade-offs behind it.
- **Still genuinely not built** (do not assume these exist): NextAuth UI screens beyond the API route, AI chat/RAG features, a Python/FastAPI AI service, multi-language (EN) support, workspace multi-tenancy, automated tests, CI. See `ECHO_functional_requirements.md` for the original full spec and `plans/growth-plan.md` for what's built vs. planned today.

## Conventions

- No semicolons, single quotes, 2-space indent, 100-char line width, ES5 trailing commas — enforced by Prettier (`.prettierrc`); run `npm run format` rather than hand-formatting.
- ESLint (`.eslintrc.json`) extends `next/core-web-vitals` + `@typescript-eslint/recommended`, with `@typescript-eslint/no-explicit-any` as an **error** (not a warning) — avoid `any` types.
- TypeScript `strict` mode is on.
