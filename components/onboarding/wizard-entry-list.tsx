export interface WizardEntryItem {
  id: string
  label: string
  meta?: string
}

export function WizardEntryList({
  items,
  emptyLabel,
}: {
  items: WizardEntryItem[]
  emptyLabel: string
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="rounded-md border p-3 text-sm">
          <p>{item.label}</p>
          {item.meta && <p className="mt-1 text-xs text-muted-foreground">{item.meta}</p>}
        </li>
      ))}
    </ul>
  )
}
