import { Badge } from '@/components/ui/badge'

export function TagBadges({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Badge key={tag} variant="outline">
          {tag}
        </Badge>
      ))}
    </div>
  )
}
