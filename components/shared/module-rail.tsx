'use client'

import Link from 'next/link'
import {
  positioningGroupMeta,
  positioningModules,
  productModule,
  researchGroupMeta,
  researchModules,
  type ModuleMeta,
} from '@/lib/module-meta'
import { signalToneColors, type SignalTone } from '@/lib/signal-colors'
import { useNavStage } from '@/components/shared/use-nav-stage'
import { isBaseModule, type NavStage } from '@/lib/nav-disclosure'

// Compact navigation, not a data widget — always visible, not part of the
// customizable grid (plans/archive/dashboard-redesign-plan.md Фаза 4). Replaces the
// 9 large count-only tiles that used to conflate "get to a section" with
// "see a number"; the numbers that actually matter now live in the
// actionable widgets above instead of here.
//
// A client component since C1: it follows the same progressive-disclosure
// stage as SiteNav, including the explicit toggle, and the two stay in sync
// through the shared useNavStage hook. It imports lib/module-meta itself
// rather than receiving the items as a prop — ModuleMeta carries an icon
// *component*, which a Server Component cannot pass across the boundary.
export function ModuleRail({
  counts,
  autoStage = 'full',
}: {
  counts: Record<string, number>
  autoStage?: NavStage
}) {
  const { stage, choose } = useNavStage(autoStage)

  const items: { module: ModuleMeta; tone?: SignalTone }[] = [
    { module: productModule },
    ...researchModules.map((module) => ({ module, tone: researchGroupMeta.tone })),
    ...positioningModules.map((module) => ({ module, tone: positioningGroupMeta.tone })),
  ]
  // In basic mode every hidden module is empty by construction (see
  // lib/nav-stage.ts), so this only ever removes chips reading "0" — exactly
  // the "list of things you must fill in" C1 set out to stop showing.
  const shown = stage === 'full' ? items : items.filter(({ module }) => isBaseModule(module.href))

  return (
    <nav aria-label="Разделы" className="mb-8 flex gap-1.5 overflow-x-auto pb-1">
      {shown.map(({ module, tone }) => {
        const Icon = module.icon
        const accent = tone ? signalToneColors[tone].border : 'hsl(var(--primary))'
        return (
          <Link
            key={module.href}
            href={module.href}
            className="flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            <Icon size={15} strokeWidth={1.75} style={{ color: accent }} />
            {module.label}
            <span className="font-mono text-xs text-muted-foreground/70">
              {counts[module.href]}
            </span>
          </Link>
        )
      })}

      {/* The rail carries both directions, unconditionally. The header shows
          only the expand direction and only when it fits (see site-nav.tsx),
          so this is the one place the control is always available — including
          for a mature workspace, where the derived stage is permanently 'full'
          and an "only when there is an override to undo" rule would strand a
          user who expanded once with no way to collapse again. A horizontally
          scrolling strip has room a fixed-height header does not, and "which
          sections do I see" belongs beside the dashboard's display controls. */}
      {
        <button
          type="button"
          onClick={() => choose(stage === 'basic' ? 'full' : 'basic')}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          {stage === 'basic' ? 'Все разделы' : 'Только основное'}
        </button>
      }
    </nav>
  )
}
