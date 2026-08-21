// Готовность гипотезы к решению и баланс доказательств.
//
// Чистый модуль без Prisma: страница гипотезы — Server Component, и всё, что
// здесь считается, должно проверяться юнит-тестами без базы. Запросы живут в
// app/hypotheses/[id]/page.tsx.
//
// Главный инвариант, ради которого этот файл вообще отдельный: **условия
// считаются по фактам, а не по счётчикам**. «Минимум 3 доказательства» — это
// три привязанных инсайта, а не три разговора у того же продукта и не три
// каких-нибудь связанных записи. Ноль доказательств не может дать полный балл:
// иначе экран одновременно сказал бы «готова к решению» и «решать нечего».

import { HypothesisStatus, InsightStance } from '@prisma/client'

/** Сколько доказательств считаем достаточным минимумом. */
export const MIN_EVIDENCE = 3

export type ReadinessKey = 'criterion' | 'evidence' | 'addressee' | 'feature'

export interface ReadinessInput {
  status: HypothesisStatus
  validationCriterion: string | null
  /** Количество привязанных инсайтов — именно инсайтов, а не любых связей. */
  insightCount: number
  hasSegment: boolean
  hasJtbd: boolean
  featureCount: number
}

export interface ReadinessCondition {
  key: ReadinessKey
  label: string
  met: boolean
  /**
   * Неприменимое условие не считается ни выполненным, ни проваленным и не
   * попадает в знаменатель. Нужно ровно для одного случая — см. `feature`
   * ниже: требовать фичу от опровергнутой гипотезы значит показывать
   * пользователю неверное требование.
   */
  applicable: boolean
  /** Что с этим делать. Пустая строка, если делать нечего. */
  hint: string
}

export interface Readiness {
  conditions: ReadinessCondition[]
  /** Выполнено применимых условий. */
  met: number
  /** Всего применимых условий. */
  total: number
  ready: boolean
}

export function hypothesisReadiness(input: ReadinessInput): Readiness {
  const hasCriterion = (input.validationCriterion ?? '').trim().length > 0

  // Фича нужна, чтобы подтверждённая гипотеза во что-то превратилась. У
  // опровергнутой отрабатывать нечего — проверенное «нет» это законный
  // результат исследования, а не недоделка.
  const featureApplicable = input.status !== HypothesisStatus.REJECTED

  const conditions: ReadinessCondition[] = [
    {
      key: 'criterion',
      label: 'Записан критерий проверки',
      met: hasCriterion,
      applicable: true,
      hint: hasCriterion ? '' : 'Опишите, при каком результате считаете гипотезу подтверждённой',
    },
    {
      key: 'evidence',
      label: `Собрано хотя бы ${MIN_EVIDENCE} доказательства`,
      met: input.insightCount >= MIN_EVIDENCE,
      applicable: true,
      hint:
        input.insightCount >= MIN_EVIDENCE
          ? ''
          : input.insightCount === 0
            ? 'Ни один инсайт не привязан к этой гипотезе'
            : `Привязано ${input.insightCount} — нужно ещё ${MIN_EVIDENCE - input.insightCount}`,
    },
    {
      key: 'addressee',
      label: 'Указаны сегмент и задача',
      met: input.hasSegment && input.hasJtbd,
      applicable: true,
      hint:
        input.hasSegment && input.hasJtbd
          ? ''
          : !input.hasSegment && !input.hasJtbd
            ? 'Непонятно, для кого и про какую задачу эта гипотеза'
            : !input.hasSegment
              ? 'Не указано, для какого сегмента это проверяется'
              : 'Не указано, какую задачу клиента это закрывает',
    },
    {
      key: 'feature',
      label: 'Выбрана фича, которая её отрабатывает',
      met: input.featureCount > 0,
      applicable: featureApplicable,
      hint:
        !featureApplicable || input.featureCount > 0
          ? ''
          : 'Если гипотеза подтвердится, непонятно, что мы по ней сделаем',
    },
  ]

  const applicable = conditions.filter((c) => c.applicable)
  const met = applicable.filter((c) => c.met).length

  return {
    conditions,
    met,
    total: applicable.length,
    ready: met === applicable.length,
  }
}

/** Невыполненные применимые условия — из них собирается блок «Что можно сделать». */
export function unmetConditions(readiness: Readiness): ReadinessCondition[] {
  return readiness.conditions.filter((c) => c.applicable && !c.met)
}

export interface EvidenceBalance {
  supports: number
  contradicts: number
  /** Инсайты без стороны: они привязаны, но ни за, ни против. */
  neutral: number
  /** Всего привязано, включая нейтральные. */
  total: number
  /**
   * Доли для полосы баланса, в процентах от **высказавшихся**, а не от всех.
   * Нейтральные в полосу не идут: они ничего не утверждают, и растворять их
   * в «за» или «против» значило бы приписать им мнение. Их число подписано
   * рядом с полосой отдельно.
   */
  supportsPercent: number
  contradictsPercent: number
}

export function evidenceBalance(stances: (InsightStance | null)[]): EvidenceBalance {
  const supports = stances.filter((s) => s === InsightStance.SUPPORTS).length
  const contradicts = stances.filter((s) => s === InsightStance.CONTRADICTS).length
  const neutral = stances.length - supports - contradicts
  const voiced = supports + contradicts

  return {
    supports,
    contradicts,
    neutral,
    total: stances.length,
    // Ноль высказавшихся — ноль в обеих долях, а не деление на ноль и не
    // 50/50: пустая полоса честно показывает, что голосов нет.
    supportsPercent: voiced === 0 ? 0 : Math.round((supports / voiced) * 100),
    contradictsPercent: voiced === 0 ? 0 : 100 - Math.round((supports / voiced) * 100),
  }
}
