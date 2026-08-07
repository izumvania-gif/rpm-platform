import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import type { SignalTone } from '@/lib/signal-colors'

export function SignalBadge({ tone, children }: { tone: SignalTone; children: ReactNode }) {
  return <Badge variant={tone}>{children}</Badge>
}
