export default function Loading() {
  return (
    <main className="container max-w-3xl space-y-8 py-12 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-2/3 rounded bg-muted" />
        <div className="h-4 w-full max-w-lg rounded bg-muted" />
      </div>

      <div className="divide-y rounded-md border">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-4 w-16 rounded bg-muted" />
          </div>
        ))}
      </div>

      <div className="flex justify-end border-t pt-6">
        <div className="h-10 w-44 rounded bg-muted" />
      </div>
    </main>
  )
}
