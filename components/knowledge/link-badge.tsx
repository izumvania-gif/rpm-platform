import type { KnowledgeLinkBadge } from '@/lib/knowledge-links'

// Один вид бейджа на все три списка базы знаний — иначе «не привязан» на
// разговоре и на инсайте выглядели бы по-разному и читались бы как разные вещи.
//
// Янтарный только у разрыва: цвет означает «здесь чего-то не хватает» (правило
// цвета, фаза 1). Связь, которая есть, — это норма, а не новость, и красить её
// не за что.
export function LinkBadge({ badge }: { badge: KnowledgeLinkBadge }) {
  return (
    <span
      title={badge.title}
      className="inline-block whitespace-nowrap rounded border px-1.5 py-0.5 text-xs"
      style={
        badge.isGap
          ? {
              borderColor: 'hsl(var(--signal-amber-border))',
              color: 'hsl(var(--signal-amber-text))',
            }
          : undefined
      }
    >
      {!badge.isGap && <span className="text-muted-foreground">{badge.label}</span>}
      {badge.isGap && badge.label}
    </span>
  )
}
