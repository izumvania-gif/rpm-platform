// Progressive disclosure of the navigation (plans/2.0-product-leap-plan.md, C1).
//
// The nav used to present all 13 modules from the first second, which reads as
// a list of things you are obliged to fill in — the plan names this as the main
// source of the "unliftable" feeling. So a new practice sees only the base
// chain the method actually starts with: Продукт -> Сегменты -> JTBD.
//
// Two rules keep this honest rather than clever:
//
//  1. **Basic mode only ever hides EMPTY modules.** The stage is derived from
//     whether anything exists beyond the base, so the nav can never hide the
//     user's own data from them. See getNavStage in lib/nav-stage.ts.
//  2. **Hiding a link is not hiding a route.** Every route stays reachable by
//     URL, by search, and by the `g`-prefixed keyboard shortcuts. This is
//     disclosure, not access control — the same stance the persona switcher
//     takes (see CLAUDE.md's information-architecture note).
//
// Pure and client-safe on purpose: SiteNav and ModuleRail are both client
// components and share this, while the Prisma side lives in lib/nav-stage.ts.

export type NavStage = 'basic' | 'full'

/**
 * The base contour, as named by the plan. Always visible, in every stage —
 * these three are the chain a discovery practice actually starts with, and a
 * user should reach first value without ever learning what an RTB is.
 */
export const BASE_MODULE_HREFS = ['/products', '/segments', '/jtbd'] as const

export function isBaseModule(href: string): boolean {
  return (BASE_MODULE_HREFS as readonly string[]).includes(href)
}

/**
 * The stage the data itself implies. `hasDataBeyondBase` comes from an
 * existence check across the non-base modules, so 'basic' is only ever
 * returned when every one of them is empty.
 */
export function deriveNavStage(hasDataBeyondBase: boolean): NavStage {
  return hasDataBeyondBase ? 'full' : 'basic'
}

/** An explicit choice always wins over the derived one. */
export function resolveNavStage(auto: NavStage, override: NavStage | null): NavStage {
  return override ?? auto
}

/**
 * Whether the HEADER should offer the show/hide control.
 *
 * Only when it means something there: while collapsed, or while an override is
 * in force so it can be undone. A mature workspace with no override gets no
 * extra button — header space is genuinely scarce (adding one text button
 * there once pushed the search box over the JTBD tab, and measuring again for
 * C1 showed the expanded nav covering this very control at 1280px).
 *
 * The dashboard's module rail is not bound by this: it shows the control
 * unconditionally, so there is always one place to collapse from. Gating the
 * rail the same way would strand a mature user who expanded once — choosing
 * the derived stage clears the override, which would then remove the only
 * button that could collapse it again.
 */
export function shouldOfferStageToggle(auto: NavStage, override: NavStage | null): boolean {
  return resolveNavStage(auto, override) === 'basic' || override !== null
}

/** Keeps an href list to what the current stage shows. */
export function visibleHrefs<T extends { href: string }>(items: T[], stage: NavStage): T[] {
  return stage === 'full' ? items : items.filter((item) => isBaseModule(item.href))
}

/**
 * Broadcast so the nav and the dashboard's module rail react to the same
 * toggle without a shared provider — the same custom-event pattern the quick
 * capture overlay already uses (components/shared/keyboard-shortcuts.tsx).
 */
export const NAV_STAGE_EVENT = 'rpm:nav-stage-change'
