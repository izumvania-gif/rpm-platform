import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Signal variants (violet/red/blue/slate) put the app-wide `--signal-*`
// taxonomy (app/globals.css, lib/signal-colors.ts) directly on Badge instead
// of it living only in the separate JobTypeBadge/SignalBadge components —
// those now just call Badge with one of these variants (Фаза 2).
const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'text-foreground',
        violet:
          'border-[hsl(var(--signal-violet-border))] bg-[hsl(var(--signal-violet-bg))] text-[hsl(var(--signal-violet-text))]',
        red: 'border-[hsl(var(--signal-red-border))] bg-[hsl(var(--signal-red-bg))] text-[hsl(var(--signal-red-text))]',
        blue: 'border-[hsl(var(--signal-blue-border))] bg-[hsl(var(--signal-blue-bg))] text-[hsl(var(--signal-blue-text))]',
        slate:
          'border-[hsl(var(--signal-slate-border))] bg-[hsl(var(--signal-slate-bg))] text-[hsl(var(--signal-slate-text))]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
