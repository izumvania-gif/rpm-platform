import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { emptyStateFor } from '@/lib/empty-states'
import { moduleByHref } from '@/lib/module-meta'

// Teaching empty state (plans/2.0-product-leap-plan.md, A5). Replaces the
// dead-end "Пока нет X." sentence with what the entity is for, what a real
// one looks like, and one action.
//
// Server component on purpose — it renders no client state, and every call
// site is already a Server Component page. Content comes from
// lib/empty-states.ts keyed by module href so the same copy appears wherever
// a module is empty (own list page, product detail, /pm section).
//
// Two sizes: `page` for a module's own empty list page (the user came here
// specifically), `inline` for a section inside an already-busy page, where a
// full teaching block would shout over the sections that do have content.
export function EmptyState({
  moduleKey,
  productId,
  icon: iconProp,
  variant = 'page',
  className,
}: {
  /** Key into lib/empty-states.ts — usually the module's href. */
  moduleKey: string
  /** Substituted into the action href for product-scoped modules. */
  productId?: string
  /** Defaults to the module's own icon from lib/module-meta.ts. */
  icon?: LucideIcon
  variant?: 'page' | 'inline'
  className?: string
}) {
  const content = emptyStateFor(moduleKey, productId)
  if (!content) return null

  const Icon = iconProp ?? moduleByHref[moduleKey]?.icon
  const inline = variant === 'inline'

  return (
    <div
      className={cn(
        'rounded-lg border border-dashed',
        inline ? 'px-4 py-4' : 'px-6 py-8',
        className
      )}
    >
      <div className={cn('flex gap-3', inline ? 'items-start' : 'items-start')}>
        {Icon && (
          <Icon
            size={inline ? 16 : 20}
            strokeWidth={1.75}
            aria-hidden
            className="mt-0.5 shrink-0 text-primary"
          />
        )}
        <div className="min-w-0 space-y-3">
          <p className={cn('text-foreground', inline ? 'text-sm' : 'text-sm leading-relaxed')}>
            {content.what}
          </p>

          {/* The example is the actual teaching device — a PM recognises a
              good segment/JTBD faster from one real instance than from any
              amount of description. */}
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Например
            </p>
            <ul className="space-y-0.5">
              {content.examples.map((example) => (
                <li key={example} className="text-sm text-muted-foreground">
                  <span aria-hidden className="mr-1.5 text-primary/50">
                    —
                  </span>
                  {example}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href={content.actionHref}
              className={cn(buttonVariants({ size: inline ? 'sm' : 'default' }))}
            >
              {content.actionLabel}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
