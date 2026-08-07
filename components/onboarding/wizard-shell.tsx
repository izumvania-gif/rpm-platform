import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { WIZARD_STEPS } from './wizard-steps'

export function WizardShell({
  productId,
  activeStep,
  title,
  subtitle,
  children,
}: {
  productId: string
  activeStep: string
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  const activeIndex = WIZARD_STEPS.findIndex((s) => s.key === activeStep)
  const prevStep = activeIndex > 0 ? WIZARD_STEPS[activeIndex - 1] : null
  const nextKey =
    activeIndex >= 0 && activeIndex < WIZARD_STEPS.length - 1
      ? WIZARD_STEPS[activeIndex + 1].key
      : 'done'

  return (
    <main className="container max-w-3xl py-12 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs">
          {WIZARD_STEPS.map((step, i) => (
            <li key={step.key}>
              <Link
                href={`/products/${productId}/onboarding/${step.key}`}
                className={cn(
                  'inline-block whitespace-nowrap rounded-full border px-2.5 py-1 transition-colors',
                  i === activeIndex
                    ? 'border-primary bg-primary font-medium text-primary-foreground'
                    : i < activeIndex
                      ? 'border-primary/40 text-primary hover:bg-accent'
                      : 'text-muted-foreground hover:bg-accent'
                )}
              >
                {i + 1}. {step.label}
              </Link>
            </li>
          ))}
        </ol>
        <Link
          href={`/products/${productId}`}
          className="shrink-0 text-xs text-muted-foreground hover:underline"
        >
          Пропустить настройку →
        </Link>
      </div>

      <div>
        <h1 className="mb-1 text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>

      {children}

      <div className="flex items-center justify-between border-t pt-6">
        {prevStep ? (
          <Link
            href={`/products/${productId}/onboarding/${prevStep.key}`}
            className={buttonVariants({ variant: 'outline' })}
          >
            ← Назад
          </Link>
        ) : (
          <span />
        )}
        <Link
          href={`/products/${productId}/onboarding/${nextKey}`}
          className={buttonVariants()}
        >
          Далее →
        </Link>
      </div>
    </main>
  )
}
