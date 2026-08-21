import { cn } from '@/lib/utils'
import { categoricalTones, signalToneColors, type SignalTone } from '@/lib/signal-colors'

// Person gets no dedicated color field — the tone is derived once,
// deterministically, from the name, so the same person always renders in the
// same one of the app's 4 existing --signal-* tones rather than inventing a
// 5th palette just for avatars.
//
// Берётся именно `categoricalTones`, а не весь `signalTones`: цвет аватара
// ничего не утверждает о человеке, он только отличает одного от другого. Если
// хеш начнёт раздавать янтарный и зелёный, кому-то достанется аватар цвета
// «здесь разрыв», а кому-то — цвета «подтверждено» (фаза 1 редизайна 2.1).
function toneForName(name: string): SignalTone {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0
  }
  return categoricalTones[Math.abs(hash) % categoricalTones.length]
}

function initialsForName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

const sizeClasses = {
  sm: 'h-7 w-7 text-[11px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-12 w-12 text-sm',
}

export function PersonAvatar({
  name,
  avatarUrl,
  size = 'md',
  className,
}: {
  name: string
  avatarUrl?: string | null
  size?: keyof typeof sizeClasses
  className?: string
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary external URL, no domain to whitelist for next/image
      <img
        src={avatarUrl}
        alt=""
        className={cn(sizeClasses[size], 'shrink-0 rounded-full object-cover', className)}
      />
    )
  }

  const tone = signalToneColors[toneForName(name)]
  return (
    <span
      aria-hidden
      className={cn(
        sizeClasses[size],
        'flex shrink-0 items-center justify-center rounded-full font-display font-bold',
        className
      )}
      style={{ backgroundColor: tone.bg, color: tone.text }}
    >
      {initialsForName(name)}
    </span>
  )
}
