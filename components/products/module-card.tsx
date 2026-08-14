import Link from 'next/link'
import { CircleAlert } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ModuleRows } from '@/lib/product-overview'
import { attentionSummary } from '@/lib/product-overview'

// One module of a product, as a glance rather than as a list.
//
// Three rules, all of them about extracting something actionable fast:
//   1. A row is one line. The full text lives on the record's own page and in
//      the row's title attribute; a card that reprints six JTBD sentences is a
//      wall, and nobody reads the sixth.
//   2. Rows that need attention come first and carry a mark, so the card
//      answers "what should I do here" before "what is in here".
//   3. Five rows, then a link to the module's own page — which is where a full,
//      sortable, filterable list already exists.
export function ProductModuleCard({
  title,
  data,
  addHref,
  addLabel,
  allHref,
  emptyLabel,
  attentionLabel,
}: {
  title: string
  data: ModuleRows
  addHref: string
  /** Full label for screen readers; the button itself shows a bare «+». */
  addLabel: string
  allHref: string
  emptyLabel: string
  /** Completes the header verdict: «3 <без задач>». */
  attentionLabel: string
}) {
  const verdict = attentionSummary(data, attentionLabel)

  return (
    <Card>
      <CardHeader className="flex flex-row items-baseline justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="min-w-0 text-base font-semibold">
          <Link href={allHref} className="hover:underline">
            {title}
          </Link>{' '}
          <span className="font-normal text-muted-foreground">{data.total}</span>
          {verdict && (
            <span className="ml-2 whitespace-nowrap text-xs font-normal text-[hsl(var(--signal-red-text))]">
              {verdict}
            </span>
          )}
        </CardTitle>
        <Link
          href={addHref}
          aria-label={addLabel}
          title={addLabel}
          className={
            buttonVariants({ variant: 'outline', size: 'sm' }) + ' shrink-0 px-2.5 print:hidden'
          }
        >
          +
        </Link>
      </CardHeader>
      <CardContent className="pt-0">
        {data.total === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <>
            <ul className="divide-y text-sm">
              {data.rows.map((row) => (
                <li key={row.href} className="flex items-baseline gap-2 py-1.5 first:pt-0">
                  {row.attentionHint ? (
                    <CircleAlert
                      size={13}
                      aria-label={row.attentionHint}
                      className="mt-0.5 shrink-0 self-start text-[hsl(var(--signal-red-border))]"
                    />
                  ) : (
                    <span aria-hidden className="w-[13px] shrink-0" />
                  )}
                  <Link
                    href={row.href}
                    title={row.label}
                    className="min-w-0 flex-1 truncate hover:underline"
                  >
                    {row.label}
                  </Link>
                  {row.meta && (
                    <span
                      title={row.attentionHint}
                      className="shrink-0 font-mono text-xs text-muted-foreground"
                    >
                      {row.meta}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {data.hiddenCount > 0 && (
              <Link
                href={allHref}
                className="mt-2 inline-block text-xs text-muted-foreground hover:underline"
              >
                Ещё {data.hiddenCount} →
              </Link>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
