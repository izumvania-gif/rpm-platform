import { HypothesisStatus, ResearchStatus, ResearchType, Stage } from '@prisma/client'

export const stageLabels: Record<Stage, string> = {
  IDEA: 'Идея',
  MVP: 'MVP',
  GROWTH: 'Рост',
  SCALE: 'Масштабирование',
}

export const statusLabels: Record<ResearchStatus, string> = {
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Завершено',
}

export const typeLabels: Record<ResearchType, string> = {
  QUALITATIVE: 'Качественное',
  SURVEY: 'Опрос',
  ANALYTICS: 'Аналитика',
  DESK_RESEARCH: 'Desk Research',
  MANUAL: 'Ручное',
  QUANTITATIVE: 'Количественное',
  USABILITY_TESTING: 'Юзабилити-тестирование',
}

export const hypothesisStatusLabels: Record<HypothesisStatus, string> = {
  DRAFT: 'Черновик',
  IN_REVIEW: 'На проверке',
  CONFIRMED: 'Подтверждена',
  REJECTED: 'Опровергнута',
}

export const hypothesisStatusOrder: HypothesisStatus[] = [
  HypothesisStatus.DRAFT,
  HypothesisStatus.IN_REVIEW,
  HypothesisStatus.CONFIRMED,
  HypothesisStatus.REJECTED,
]
