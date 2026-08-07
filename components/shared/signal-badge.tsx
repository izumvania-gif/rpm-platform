import type { ReactNode } from 'react'
import { signalToneColors, type SignalTone } from '@/lib/signal-colors'

export function SignalBadge({ tone, children }: { tone: SignalTone; children: ReactNode }) {
  const colors = signalToneColors[tone]
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }}
    >
      {children}
    </span>
  )
}
