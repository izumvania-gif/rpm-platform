import Link from 'next/link'
import { CircleAlert } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ModuleRows } from '@/lib/product-overview'
import { attentionSummary } from '@/lib/product-overview'
import { QuickAddButton } from '@/components/shared/quick-add-button'
import type { CaptureType } from '@/lib/quick-capture'

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
  addType,
  productId,
  allHref,
  emptyLabel,
  attentionLabel,
}: {
  title: string
  data: ModuleRows
  addHref: string
  /** Full label for screen readers; the button itself shows a bare «+». */
  addLabel: string
  /** When set, «+» captures in place instead of navigating to `addHref`. */
  addType?: CaptureType
  productId: string
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
        <QuickAddButton type={addType} productId={productId} href={addHref} label={addLabel} />
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
                    // Always the untouched text: the row may show only the
                    // key phrase, and hovering must not hide the rest.
                    title={row.fullLabel ?? row.label}
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
