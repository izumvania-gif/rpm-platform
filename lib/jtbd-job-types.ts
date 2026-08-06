import { JtbdJobType } from '@prisma/client'

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

// Цвета читаются из CSS-переменных темы (app/globals.css: --jtbd-*), а не хардкодятся —
// так у графа/бейджей есть согласованная тёмная тема, как и у остального UI.
export const jtbdJobTypeColors: Record<JtbdJobType, { bg: string; text: string; border: string }> =
  {
    BIG_JOB: {
      bg: 'hsl(var(--jtbd-big-bg))',
      text: 'hsl(var(--jtbd-big-text))',
      border: 'hsl(var(--jtbd-big-border))',
    },
    CORE_JOB: {
      bg: 'hsl(var(--jtbd-core-bg))',
      text: 'hsl(var(--jtbd-core-text))',
      border: 'hsl(var(--jtbd-core-border))',
    },
    SMALL_JOB: {
      bg: 'hsl(var(--jtbd-small-bg))',
      text: 'hsl(var(--jtbd-small-text))',
      border: 'hsl(var(--jtbd-small-border))',
    },
    MICRO_JOB: {
      bg: 'hsl(var(--jtbd-micro-bg))',
      text: 'hsl(var(--jtbd-micro-text))',
      border: 'hsl(var(--jtbd-micro-border))',
    },
  }
