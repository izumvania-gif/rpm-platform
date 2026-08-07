import { JtbdJobType } from '@prisma/client'
import { signalToneColors } from '@/lib/signal-colors'

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
