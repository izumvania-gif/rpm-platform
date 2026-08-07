export function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-l-4 border-primary pl-3">
      <h2 className="text-xl font-bold">{title}</h2>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  )
}
