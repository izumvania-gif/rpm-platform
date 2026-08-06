# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ECHO Platform (repo: rpm-platform) — a product discovery / research management tool for product managers: research repository, customer segments, and (planned) JTBD, hypotheses, CustDev conversations, and AI features. See `ECHO_functional_requirements.md` for the full product spec and `plans/mvp-development-plan.md` for the phased MVP build-out (Phase 0 — infra setup — is complete; Phase 1+ — auth UI, Products, Research, Segments modules — is not yet built). Product-facing text (UI copy, docs) is in Russian; code, identifiers, and comments are in English.

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
- **Data layer:** Prisma ORM against PostgreSQL, schema in `prisma/schema.prisma`. Core models: `User`, `Product`, `Research`, `Segment`, each scoped to a `userId` (single-tenant MVP — no workspace/org model yet). Import the shared client from `lib/prisma.ts` (`prisma` singleton guarded against hot-reload duplication) rather than instantiating `PrismaClient` directly. After changing `schema.prisma`, run `npm run db:generate` (and `db:push` or `db:migrate` to sync the DB).
- **Auth:** NextAuth.js with the Credentials provider (email + bcrypt-hashed password), JWT session strategy, configured in `lib/auth.ts` and mounted at `app/api/auth/[...nextauth]/route.ts`. Session/User/JWT types are augmented in `types/next-auth.d.ts` to carry `id` through `session.user.id` and the JWT token.
- **UI components:** shadcn/ui, configured via `components.json` (style: default, baseColor: slate, CSS variables). Component directories (`components/ui`, `components/forms`, `components/layouts`, `components/shared`) exist as placeholders — populate with shadcn's CLI or by hand following that split. `lib/utils.ts` provides the standard shadcn `cn()` helper (clsx + tailwind-merge) for conditional class names.
- **Path aliases:** `@/*` maps to the repo root (see `tsconfig.json`), e.g. `@/lib/prisma`, `@/components/...`.
- **Planned but not yet implemented** (do not assume these exist): route groups `(auth)` and `(dashboard)`, JTBD/Hypotheses/Conversations/Competitors models, AI chat/RAG features, multi-language (EN) support, workspace multi-tenancy, PDF/CSV export. Check `ECHO_functional_requirements.md` before building toward these to confirm current scope.

## Conventions

- No semicolons, single quotes, 2-space indent, 100-char line width, ES5 trailing commas — enforced by Prettier (`.prettierrc`); run `npm run format` rather than hand-formatting.
- ESLint (`.eslintrc.json`) extends `next/core-web-vitals` + `@typescript-eslint/recommended`, with `@typescript-eslint/no-explicit-any` as an **error** (not a warning) — avoid `any` types.
- TypeScript `strict` mode is on.
