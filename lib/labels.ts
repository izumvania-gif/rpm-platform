import {
  HypothesisStatus,
  ProductResourceKind,
  ResearchStatus,
  ResearchType,
  Stage,
} from '@prisma/client'
import { CircleCheck, CircleX, Eye, FileEdit, type LucideIcon } from 'lucide-react'
import type { SignalTone } from '@/lib/signal-colors'

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

// Signal tone per pipeline stage: neutral while unevaluated, active while in motion,
// strongest signal once validated, brand-red (already the "stop/negative" color via
// --destructive) once rejected. See plans/growth-plan.md §2.7.
export const hypothesisStatusTone: Record<HypothesisStatus, SignalTone> = {
  DRAFT: 'slate',
  IN_REVIEW: 'blue',
  CONFIRMED: 'violet',
  REJECTED: 'red',
}

// Фаза 3 kanban-card redesign (plans/visual-redesign-plan.md §4) — a status
// icon on each card in addition to the column's color stripe.
export const hypothesisStatusIcon: Record<HypothesisStatus, LucideIcon> = {
  DRAFT: FileEdit,
  IN_REVIEW: Eye,
  CONFIRMED: CircleCheck,
  REJECTED: CircleX,
}

export const productResourceKindLabels: Record<ProductResourceKind, string> = {
  SALES_KIT: 'Sales-kit',
  DEVELOPER_DOC: 'Документация для разработчиков',
  CONFLUENCE_LINK: 'Confluence',
  JIRA_LINK: 'Jira',
  OTHER: 'Другое',
}
