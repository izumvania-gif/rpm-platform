// «Что мешает» — что на этой карточке не даёт ей работать (фаза 8 редизайна 2.1).
//
// Правило, без которого блок превращается в украшение: **условия читают факты,
// которые приложение уже считает, и ни одного нового суждения не изобретают.**
// `confirmed`, `isStale()`, количество связей — всё это существующие понятия,
// на которые уже реагируют отчёт «Пробелы», матрица покрытия и лента цепочки.
// Блок только собирает их в одном месте на карточке.
//
// Второе правило — **не пересказывать ленту цепочки.** У JTBD и фичи лента уже
// показывает разрывы связей и с фазы 7 умеет их чинить прямо в слоте; повторять
// их здесь значило бы повторить ошибку, которую я уже сделал в фазе 3, где
// чек-лист и блок «Что можно сделать» оказались пересказом друг друга строка в
// строку. Поэтому у типов с лентой здесь остаётся только то, чего в ленте нет:
// у JTBD — подтверждение исследованием, у фичи — связь с гипотезой (её на
// ленте фичи нет вовсе).
//
// Третье — **у каждого условия есть действие.** Условие без кнопки это жалоба,
// а не задача. Куда ведёт кнопка, решает то же правило, что и в чек-листе
// готовности: чинится на этой же странице — якорь к своей секции; требует
// другой страницы — ссылка туда.
//
// Чистый модуль: запросов нет, на вход приходят уже посчитанные числа и флаги.

import { isStale } from '@/lib/utils'

export type RecordKind = 'segment' | 'jtbd' | 'feature' | 'rtb' | 'competitor'

export interface Blocker {
  key: string
  /** Что не так — одной строкой, утверждением, а не вопросом. */
  label: string
  /** Почему это важно: что именно ломается, пока условие не выполнено. */
  hint: string
  actionLabel: string
  actionHref: string
}

export type BlockerInput =
  | {
      kind: 'segment'
      id: string
      productId: string
      jtbdCount: number
      conversationCount: number
    }
  | {
      kind: 'jtbd'
      id: string
      productId: string
      confirmed: boolean
      hasResearch: boolean
    }
  | {
      kind: 'feature'
      id: string
      productId: string
      hypothesisCount: number
    }
  | {
      kind: 'rtb'
      id: string
      productId: string
      featureCount: number
    }
  | {
      kind: 'competitor'
      id: string
      productId: string
      hasPositioning: boolean
      featureCount: number
      lastCheckedAt: Date | null
    }

/** Матрицы связей — там связь ставится одним кликом, без формы. */
function linksHref(productId: string): string {
  return `/products/${productId}/links`
}

export function recordBlockers(input: BlockerInput): Blocker[] {
  const blockers: Blocker[] = []

  switch (input.kind) {
    case 'segment': {
      if (input.jtbdCount === 0) {
        blockers.push({
          key: 'no-jtbd',
          label: 'Ни одной задачи (JTBD)',
          hint: 'Сегмент — начало цепочки: пока у него нет задач, ниже не появятся ни гипотезы, ни фичи.',
          actionLabel: 'К задачам',
          actionHref: '#jtbds',
        })
      }
      if (input.conversationCount === 0) {
        blockers.push({
          key: 'no-conversations',
          label: 'Ни одного разговора с этим сегментом',
          hint: 'Портрет сегмента пока ни на чём не основан — это описание, а не наблюдение.',
          actionLabel: 'Записать разговор',
          actionHref: `/conversations/new?productId=${input.productId}`,
        })
      }
      break
    }

    case 'jtbd': {
      // Одно условие, а не два: «не отмечен подтверждённым» и «нет
      // исследования» — это одна проблема, увиденная с двух сторон, и двумя
      // строками она читалась бы как две разные.
      if (!input.confirmed) {
        blockers.push(
          input.hasResearch
            ? {
                key: 'unconfirmed',
                label: 'Исследование привязано, но задача не отмечена подтверждённой',
                hint: 'Пока флага нет, отчёт «Пробелы» считает задачу догадкой.',
                actionLabel: 'Отметить подтверждённой',
                actionHref: `/jtbd/${input.id}/edit`,
              }
            : {
                key: 'unconfirmed',
                label: 'Не подтверждён исследованием',
                hint: 'К задаче не привязано ни одного исследования — она записана, но не проверена.',
                actionLabel: 'Привязать исследование',
                actionHref: `/jtbd/${input.id}/edit`,
              }
        )
      }
      break
    }

    case 'feature': {
      // Связи с JTBD и обещаниями показывает лента цепочки — здесь только то,
      // чего в ленте фичи нет.
      if (input.hypothesisCount === 0) {
        blockers.push({
          key: 'no-hypothesis',
          label: 'Не связана ни с одной гипотезой',
          hint: 'Решение без вопроса, на который оно отвечает: непонятно, что мы этой фичей проверяем.',
          actionLabel: 'Связать с гипотезой',
          actionHref: linksHref(input.productId),
        })
      }
      break
    }

    case 'rtb': {
      if (input.featureCount === 0) {
        blockers.push({
          key: 'no-features',
          label: 'Не опирается ни на одну фичу',
          hint: 'Обещание без основания — подтвердить его нечем.',
          actionLabel: 'Связать с фичей',
          actionHref: linksHref(input.productId),
        })
      }
      break
    }

    case 'competitor': {
      if (!input.hasPositioning) {
        blockers.push({
          key: 'no-positioning',
          label: 'Не описано позиционирование',
          hint: 'Без него непонятно, чем мы от конкурента отличаемся и против чего играем.',
          actionLabel: 'К позиционированию',
          actionHref: '#positioning',
        })
      }
      if (input.featureCount === 0) {
        blockers.push({
          key: 'no-features',
          label: 'Не перечислено ни одной фичи конкурента',
          hint: 'Сравнивать не с чем: сопоставить свои фичи с чужими не получится.',
          actionLabel: 'К фичам конкурента',
          actionHref: '#rival-features',
        })
      }
      // null и «давно» — разные факты, и говорить о них одинаково нельзя:
      // «давно не проверяли» неверно про конкурента, которого не проверяли
      // никогда.
      if (input.lastCheckedAt === null) {
        blockers.push({
          key: 'never-checked',
          label: 'Ни разу не проверялся',
          hint: 'Неизвестно, насколько эти данные ещё верны.',
          actionLabel: 'Отметить проверку',
          actionHref: '#last-checked',
        })
      } else if (isStale(input.lastCheckedAt)) {
        blockers.push({
          key: 'stale',
          label: 'Давно не проверялся',
          hint: 'С последней проверки прошло больше трёх месяцев — данные могли устареть.',
          actionLabel: 'Отметить проверку',
          actionHref: '#last-checked',
        })
      }
      break
    }
  }

  return blockers
}
