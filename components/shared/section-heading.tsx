// Heading level is a prop, not a fixed `h2` (plans/2.0-hardening-plan.md, B1).
//
// This component is used both as a *page* heading and as a *section* heading
// inside a page. Hard-coding `h2` meant 15 list pages shipped a document whose
// heading outline started at level 2 with no `h1` at all — a screen reader user
// gets no page title, and the outline is malformed.
//
// Default stays `h2` so every existing section-level call site is unaffected;
// pages pass `level={1}` where this really is the page's title.
export function SectionHeading({
  title,
  description,
  level = 2,
}: {
  title: string
  description?: string
  level?: 1 | 2
}) {
  const Heading = level === 1 ? 'h1' : 'h2'
  return (
    <div className="border-l-4 border-primary pl-3">
      {/* Size is deliberately identical at both levels: this is a semantic
          fix, not a visual redesign — the pages should look exactly as before. */}
      <Heading className="text-xl font-bold">{title}</Heading>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  )
}
