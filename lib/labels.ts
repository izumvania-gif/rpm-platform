import {
  HypothesisStatus,
  ProductResourceKind,
  ResearchStatus,
  ResearchType,
  RoadmapStatus,
  Stage,
} from '@prisma/client'
import {
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleX,
  Eye,
  FileEdit,
  PauseCircle,
  Rocket,
  type LucideIcon,
} from 'lucide-react'
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

// Фаза 3 kanban-card redesign (plans/archive/visual-redesign-plan.md §4) — a status
// icon on each card in addition to the column's color stripe.
export const hypothesisStatusIcon: Record<HypothesisStatus, LucideIcon> = {
  DRAFT: FileEdit,
  IN_REVIEW: Eye,
  CONFIRMED: CircleCheck,
  REJECTED: CircleX,
}

// 2.0 (plans/platform-views-plan.md §1) — same 4-tone mapping as
// hypothesisStatusTone above: slate for not-started, blue for active,
// violet for the strongest positive signal, red for stopped/not moving.
export const roadmapStatusLabels: Record<RoadmapStatus, string> = {
  PLANNED: 'Запланировано',
  IN_PROGRESS: 'В работе',
  SHIPPED: 'Выпущено',
  PAUSED: 'Приостановлено',
}

export const roadmapStatusOrder: RoadmapStatus[] = [
  RoadmapStatus.PLANNED,
  RoadmapStatus.IN_PROGRESS,
  RoadmapStatus.SHIPPED,
  RoadmapStatus.PAUSED,
]

export const roadmapStatusTone: Record<RoadmapStatus, SignalTone> = {
  PLANNED: 'slate',
  IN_PROGRESS: 'blue',
  SHIPPED: 'violet',
  PAUSED: 'red',
}

export const roadmapStatusIcon: Record<RoadmapStatus, LucideIcon> = {
  PLANNED: CircleDashed,
  IN_PROGRESS: CircleDot,
  SHIPPED: Rocket,
  PAUSED: PauseCircle,
}

export const productResourceKindLabels: Record<ProductResourceKind, string> = {
  SALES_KIT: 'Sales-kit',
  DEVELOPER_DOC: 'Документация для разработчиков',
  CONFLUENCE_LINK: 'Confluence',
  JIRA_LINK: 'Jira',
  OTHER: 'Другое',
}
