import { Info } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

// Phase 0 of plans/platform-views-plan.md deliberately ships the persona
// switcher before any of its 5 destinations are real — this renders the
// "coming in a later phase" placeholder for all of them, so the shell is
// honest about being a shell rather than pretending with fake data.
export function PersonaStub({
  title,
  tagline,
  planned,
}: {
  title: string
  tagline: string
  planned: string[]
}) {
  return (
    <main className="container max-w-2xl py-12 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">{title}</h1>
        <p className="text-muted-foreground">{tagline}</p>
      </div>
      <Card variant="content" className="border-l-4 border-primary">
        <CardContent className="flex gap-3 py-5">
          <Info size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-primary" />
          <div className="space-y-3 text-sm">
            <p>
              Раздел ещё не реализован — это Фаза 0 плана{' '}
              <code className="rounded bg-muted px-1 py-0.5">plans/platform-views-plan.md</code>
              (переключатель между представлениями уже есть, содержимое появляется по фазам).
            </p>
            <div>
              <p className="mb-1 font-medium text-foreground">Что здесь появится:</p>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                {planned.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
