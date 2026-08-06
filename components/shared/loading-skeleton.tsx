export function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <main className="container py-12 animate-pulse">
      <div className="flex items-center justify-between mb-8">
        <div className="h-8 w-40 rounded bg-muted" />
        <div className="h-10 w-32 rounded-md bg-muted" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg border bg-muted/40" />
        ))}
      </div>
    </main>
  )
}
