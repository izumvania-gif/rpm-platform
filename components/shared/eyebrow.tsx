import { cn } from '@/lib/utils'
import { signalToneTextClass, type SignalTone } from '@/lib/signal-colors'

export function Eyebrow({
  label,
  number,
  tone = 'red',
  className,
}: {
  label: string
  number?: number | string
  tone?: SignalTone
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 font-mono text-xs uppercase tracking-wide',
        signalToneTextClass[tone],
        className
      )}
    >
      {number != null && (
        <>
          <span>#{String(number).padStart(3, '0')}</span>
          <span aria-hidden className="opacity-40">
            ·
          </span>
        </>
      )}
      <span>{label}</span>
    </div>
  )
}
