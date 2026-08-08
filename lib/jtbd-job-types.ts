import { JtbdJobType } from '@prisma/client'
import { ArrowRightCircle, CircleDot, Mountain, Target, type LucideIcon } from 'lucide-react'
import { signalToneColors, type SignalTone } from '@/lib/signal-colors'

export const jtbdJobTypeOrder: JtbdJobType[] = [
  JtbdJobType.BIG_JOB,
  JtbdJobType.CORE_JOB,
  JtbdJobType.SMALL_JOB,
  JtbdJobType.MICRO_JOB,
]

export const jtbdJobTypeLabels: Record<JtbdJobType, string> = {
  BIG_JOB: 'Большая задача',
  CORE_JOB: 'Основная задача',
  SMALL_JOB: 'Малая задача',
  MICRO_JOB: 'Микрозадача',
}

export const jtbdJobTypeDescriptions: Record<JtbdJobType, string> = {
  BIG_JOB:
    'Более крупная задача, которую продукт не решает полностью — часто связана с эмоциями клиента.',
  CORE_JOB: 'Самая крупная задача, которую продукт решает полностью — суть продукта.',
  SMALL_JOB: 'Задача до или после основной — шаг на пути к core job.',
  MICRO_JOB: 'Узкая задача внутри малой или основной задачи.',
}

// Цвета читаются из сквозной таксономии `signalToneColors` (app/globals.css: --signal-*),
// а не хардкодятся — так у графа/бейджей согласованная тёмная тема, а сама таксономия
// переиспользуется за пределами JTBD (см. lib/signal-colors.ts, plans/growth-plan.md §2.7).
export const jtbdJobTypeColors: Record<JtbdJobType, { bg: string; text: string; border: string }> =
  {
    BIG_JOB: signalToneColors.violet,
    CORE_JOB: signalToneColors.red,
    SMALL_JOB: signalToneColors.blue,
    MICRO_JOB: signalToneColors.slate,
  }

// Same mapping, as a SignalTone (Badge variant name) rather than resolved
// colors — for callers building on top of <Badge variant={...}> (Фаза 2)
// instead of inline styles.
export const jtbdJobTypeTone: Record<JtbdJobType, SignalTone> = {
  BIG_JOB: 'violet',
  CORE_JOB: 'red',
  SMALL_JOB: 'blue',
  MICRO_JOB: 'slate',
}

// Фаза 3 graph-node redesign (plans/archive/visual-redesign-plan.md §4) — one icon per
// job type so the type reads at a glance without a text label: Mountain (big,
// scale not fully solved), Target (core, what the product fully solves),
// ArrowRightCircle (small, a step on the way), CircleDot (micro, a narrow
// slice within another job).
export const jtbdJobTypeIcon: Record<JtbdJobType, LucideIcon> = {
  BIG_JOB: Mountain,
  CORE_JOB: Target,
  SMALL_JOB: ArrowRightCircle,
  MICRO_JOB: CircleDot,
}
