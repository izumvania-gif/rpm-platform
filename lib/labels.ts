import {
  HypothesisStatus,
  ProductResourceKind,
  ResearchStatus,
  ResearchType,
  Stage,
} from '@prisma/client'

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

export const productResourceKindLabels: Record<ProductResourceKind, string> = {
  SALES_KIT: 'Sales-kit',
  DEVELOPER_DOC: 'Документация для разработчиков',
  CONFLUENCE_LINK: 'Confluence',
  JIRA_LINK: 'Jira',
  OTHER: 'Другое',
}
