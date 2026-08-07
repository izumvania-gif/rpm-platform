import { cn } from '@/lib/utils'
import { WIZARD_STEPS } from './wizard-steps'

export function WizardStepSkeleton({ activeStep }: { activeStep: string }) {
  const activeIndex = WIZARD_STEPS.findIndex((s) => s.key === activeStep)

  return (
    <main className="container max-w-3xl py-12 space-y-8 animate-pulse">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs">
          {WIZARD_STEPS.map((step, i) => (
            <li
              key={step.key}
              className={cn(
                'inline-block whitespace-nowrap rounded-full border px-2.5 py-1 text-transparent',
                i === activeIndex ? 'border-primary bg-primary/20' : 'border-muted bg-muted/50'
              )}
            >
              <span className="font-mono">{i + 1}.</span> {step.label}
            </li>
          ))}
        </ol>
        <div className="h-4 w-32 rounded bg-muted" />
      </div>

      <div className="space-y-2">
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="h-7 w-2/3 rounded bg-muted" />
        <div className="h-4 w-full max-w-lg rounded bg-muted" />
      </div>

      <div className="space-y-3 rounded-md border p-4">
        <div className="h-20 w-full rounded bg-muted" />
        <div className="h-9 w-28 rounded bg-muted" />
      </div>

      <div className="flex items-center justify-between border-t pt-6">
        <div className="h-9 w-20 rounded bg-muted" />
        <div className="h-9 w-24 rounded bg-muted" />
      </div>
    </main>
  )
}
