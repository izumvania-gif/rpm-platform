// Signal taxonomy — app-wide semantic color system, see plans/growth-plan.md §2.7 "Реестр".
// Single source of truth for the `--signal-*` CSS variables in app/globals.css.

// Два разных набора, намеренно не смешанные (фаза 1 редизайна 2.1).
//
// `SignalTone` целиком — это палитра, из которой можно красить что угодно.
// `categoricalTones` — подмножество, которым красится *принадлежность к типу*
// (тип JTBD-задачи, статус гипотезы): цвет там ничего не утверждает, он лишь
// отличает одно от другого, и метка рядом всегда есть.
//
// `amber` и `green` в это подмножество не входят и входить не должны: они
// зарезервированы под состояние — янтарный «здесь разрыв», зелёный
// «подтверждено». Если их начать раздавать как «ещё два цвета для категорий»,
// янтарный значок перестанет означать проблему, а ровно ради этого значения
// он и заведён.
export type SignalTone = 'violet' | 'red' | 'blue' | 'slate' | 'amber' | 'green'

export const signalTones: SignalTone[] = ['violet', 'red', 'blue', 'slate', 'amber', 'green']

export const categoricalTones: SignalTone[] = ['violet', 'red', 'blue', 'slate']

export const signalToneColors: Record<SignalTone, { bg: string; text: string; border: string }> = {
  violet: {
    bg: 'hsl(var(--signal-violet-bg))',
    text: 'hsl(var(--signal-violet-text))',
    border: 'hsl(var(--signal-violet-border))',
  },
  red: {
    bg: 'hsl(var(--signal-red-bg))',
    text: 'hsl(var(--signal-red-text))',
    border: 'hsl(var(--signal-red-border))',
  },
  blue: {
    bg: 'hsl(var(--signal-blue-bg))',
    text: 'hsl(var(--signal-blue-text))',
    border: 'hsl(var(--signal-blue-border))',
  },
  slate: {
    bg: 'hsl(var(--signal-slate-bg))',
    text: 'hsl(var(--signal-slate-text))',
    border: 'hsl(var(--signal-slate-border))',
  },
  amber: {
    bg: 'hsl(var(--signal-amber-bg))',
    text: 'hsl(var(--signal-amber-text))',
    border: 'hsl(var(--signal-amber-border))',
  },
  green: {
    bg: 'hsl(var(--signal-green-bg))',
    text: 'hsl(var(--signal-green-text))',
    border: 'hsl(var(--signal-green-border))',
  },
}

// Tailwind arbitrary-value classes for the same tokens, for callers that need utility
// classes instead of inline styles (e.g. Eyebrow). Kept as literal strings so Tailwind's
// JIT scanner can find them.
export const signalToneTextClass: Record<SignalTone, string> = {
  violet: 'text-[hsl(var(--signal-violet-text))]',
  red: 'text-[hsl(var(--signal-red-text))]',
  blue: 'text-[hsl(var(--signal-blue-text))]',
  slate: 'text-[hsl(var(--signal-slate-text))]',
  amber: 'text-[hsl(var(--signal-amber-text))]',
  green: 'text-[hsl(var(--signal-green-text))]',
}
