import Link from 'next/link'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { RutokenLogo } from '@/components/shared/rutoken-logo'

// The one deliberately session-less route in the app (see app/public/page.tsx)
// gets its own chrome instead of the internal SiteNav — an external visitor
// without a login should never see the internal CRUD nav, cross-content
// search, persona switcher, or keyboard-shortcuts hint. This is the single
// signature move of plans/2.0-visual-upgrade-plan.md: the header itself says
// "you are outside the tool," not just a re-skin of the same bar.
export function PublicHeader() {
  return (
    <header className="print:hidden">
      <div className="h-1 bg-primary" />
      <div className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link href="/public" className="flex shrink-0 items-center gap-2.5">
            <RutokenLogo className="h-4 w-auto text-primary dark:text-foreground" />
            <span aria-hidden className="h-5 w-px bg-border" />
            <span className="font-display text-lg font-bold tracking-tight">
              RPM<span className="text-primary">.</span>
            </span>
            <span className="ml-1 hidden text-sm font-medium text-muted-foreground sm:inline">
              Открытый дашборд компании
            </span>
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
