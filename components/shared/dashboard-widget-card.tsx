import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Hint } from '@/components/ui/tooltip'

// Shared chrome for the Фаза 3 actionable/graph dashboard widgets — same
// border-l-4 + title/description pattern already used by the Закреплённое
// and Последняя активность widgets from Фаза 3 of the visual redesign, so
// the new widgets read as part of the same family.
//
// `tone="secondary"` (plans/2.0-visual-upgrade-plan.md) is for sections that
// share a page with one clearly-primary section — reference material you'd
// glance at, not the thing you came to the page for. It drops the accent
// left-border and shrinks the heading instead of repeating the same full-weight
// chrome on every section regardless of how important it is.
export function DashboardWidgetCard({
  id,
  icon: Icon,
  title,
  description,
  hint,
  tone = 'primary',
  action,
  contentClassName,
  children,
}: {
  id?: string
  icon: LucideIcon
  title: string
  description?: string
  /** Что здесь считается — значок ⓘ рядом с заголовком (фаза 27 плана 2.4). */
  hint?: string
  tone?: 'primary' | 'secondary'
  action?: ReactNode
  contentClassName?: string
  children: ReactNode
}) {
  return (
    <Card id={id} variant="content" className={id ? 'scroll-mt-4' : undefined}>
      <CardHeader
        className={cn(
          'flex flex-col items-start gap-2 space-y-0 sm:flex-row sm:items-center sm:justify-between',
          tone === 'primary' && 'border-l-4 border-primary'
        )}
      >
        <div>
          {/* Значок — рядом с заголовком, не внутри: иначе он попал бы в
              доступное имя заголовка. */}
          <div className="flex items-center gap-1.5">
            <CardTitle
              className={cn(
                'flex items-center gap-1.5',
                tone === 'primary' ? 'text-base' : 'text-sm text-muted-foreground'
              )}
            >
              <Icon
                size={tone === 'primary' ? 15 : 13}
                strokeWidth={1.75}
                className={tone === 'primary' ? 'text-primary' : 'text-muted-foreground'}
              />
              {title}
            </CardTitle>
            {hint && <Hint text={hint} />}
          </div>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  )
}
