// Очередь «Требуют решения» (фаза 10 редизайна 2.1).
//
// Фаза 3 научила карточку гипотезы отвечать «готова ли она к решению», но
// ответ был виден только внутри самой карточки: чтобы понять, есть ли вообще
// что решать, приходилось открывать гипотезы по одной. Здесь тот же счёт
// собран по всей базе.
//
// **Готовность считается тем же кодом, что и на карточке** — `hypothesisReadiness`,
// без второй копии правил. Это главное требование к модулю: две реализации
// «готова к решению» разошлись бы на первой же правке, и дашборд начал бы
// звать решать то, что карточка считает недоделанным.
//
// В очередь попадает только то, что действительно можно решить: все
// применимые условия выполнены, а статус ещё открыт. «Почти готово» сюда не
// добавляется намеренно — очередь обещает, что по каждой строке можно принять
// решение прямо сейчас, и разбавить её недоделанными значило бы это обещание
// нарушить (ровно то, за чем следит инвариант фазы 3: ноль доказательств не
// может выглядеть готовым).
//
// Чистый модуль: запрос живёт в lib/dashboard-metrics.ts.

import { HypothesisStatus, type InsightStance } from '@prisma/client'
import {
  evidenceBalance,
  hypothesisReadiness,
  type EvidenceBalance,
} from '@/lib/hypothesis-readiness'
import { hypothesisKeyPhrase } from '@/lib/key-phrase'

/** Статусы, из которых решение ещё предстоит принять. */
export const OPEN_STATUSES: HypothesisStatus[] = [
  HypothesisStatus.DRAFT,
  HypothesisStatus.IN_REVIEW,
]

export interface DecisionInput {
  id: string
  statement: string
  productName: string
  status: HypothesisStatus
  validationCriterion: string | null
  /** Стороны привязанных инсайтов; `null` — инсайт без стороны. */
  stances: (InsightStance | null)[]
  hasSegment: boolean
  hasJtbd: boolean
  featureCount: number
}

export interface DecisionItem {
  id: string
  /** Ключевая фраза: очередь просматривают сверху вниз (lib/key-phrase.ts). */
  label: string
  fullLabel: string
  productName: string
  status: HypothesisStatus
  href: string
  balance: EvidenceBalance
}

export function buildDecisionQueue(inputs: DecisionInput[]): DecisionItem[] {
  return (
    inputs
      .filter((input) => {
        if (!OPEN_STATUSES.includes(input.status)) return false
        return hypothesisReadiness({
          status: input.status,
          validationCriterion: input.validationCriterion,
          insightCount: input.stances.length,
          hasSegment: input.hasSegment,
          hasJtbd: input.hasJtbd,
          featureCount: input.featureCount,
        }).ready
      })
      .map((input) => ({
        id: input.id,
        label: hypothesisKeyPhrase(input.statement),
        fullLabel: input.statement,
        productName: input.productName,
        status: input.status,
        href: `/hypotheses/${input.id}`,
        balance: evidenceBalance(input.stances),
      }))
      // Больше доказательств — выше. Сортировать «по единодушию» (сначала те,
      // где все за или все против) было бы удобнее на глаз, но это уже
      // суждение о том, какое решение проще, а не факт о данных.
      .sort((a, b) => b.balance.total - a.balance.total || a.label.localeCompare(b.label, 'ru'))
  )
}
