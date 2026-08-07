// Signal taxonomy — app-wide semantic color system, see plans/growth-plan.md §2.7 "Реестр".
// Single source of truth for the `--signal-*` CSS variables in app/globals.css.

export type SignalTone = 'violet' | 'red' | 'blue' | 'slate'

export const signalTones: SignalTone[] = ['violet', 'red', 'blue', 'slate']

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
}

// Tailwind arbitrary-value classes for the same tokens, for callers that need utility
// classes instead of inline styles (e.g. Eyebrow). Kept as literal strings so Tailwind's
// JIT scanner can find them.
export const signalToneTextClass: Record<SignalTone, string> = {
  violet: 'text-[hsl(var(--signal-violet-text))]',
  red: 'text-[hsl(var(--signal-red-text))]',
  blue: 'text-[hsl(var(--signal-blue-text))]',
  slate: 'text-[hsl(var(--signal-slate-text))]',
}
