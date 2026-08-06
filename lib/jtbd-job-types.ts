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

export const jtbdJobTypeColors: Record<JtbdJobType, { bg: string; text: string; border: string }> =
  {
    BIG_JOB: { bg: '#EDE9FE', text: '#5B21B6', border: '#7C3AED' },
    CORE_JOB: { bg: '#FEE2E2', text: '#991B1B', border: '#DC2626' },
    SMALL_JOB: { bg: '#DBEAFE', text: '#1E3A8A', border: '#2563EB' },
    MICRO_JOB: { bg: '#F1F5F9', text: '#334155', border: '#64748B' },
  }
