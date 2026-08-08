import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Shared chrome for the Фаза 3 actionable/graph dashboard widgets — same
// border-l-4 + title/description pattern already used by the Закреплённое
// and Последняя активность widgets from Фаза 3 of the visual redesign, so
// the new widgets read as part of the same family.
export function DashboardWidgetCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <Card variant="content">
      <CardHeader className="border-l-4 border-primary">
        <CardTitle className="flex items-center gap-1.5 text-base">
          <Icon size={15} strokeWidth={1.75} className="text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
