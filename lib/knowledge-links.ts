// Бейдж связи в строке базы знаний (фаза 11 редизайна 2.1).
//
// Претензия платформы к таблице в Notion — что связи здесь настоящие. В
// списках базы знаний этого было не видно: строка показывала название, продукт
// и дату, то есть ровно то, что показала бы таблица. Бейдж отвечает на вопрос
// «а с чем это связано» прямо в строке.
//
// Правило то же, что у блока «Что мешает» (фаза 8): **считаются факты, которые
// приложение уже знает, и ни одного нового суждения не изобретается.** «Разговор
// без инсайтов» и «инсайт, не привязанный ни к чему» — существующие понятия, на
// них уже реагируют карточки на странице продукта.
//
// Разрыв красится янтарным, наличие связи — нет: цвет означает «здесь чего-то
// не хватает» (правило цвета, фаза 1), а не «здесь есть данные».

import { pluralizeRu } from '@/lib/utils'

export interface KnowledgeLinkBadge {
  /** Короткая подпись в строке. */
  label: string
  /** Разрыв — красить янтарным и объяснять. */
  isGap: boolean
  /** Полная формулировка для `title`: строка узкая, а объяснение нужно. */
  title: string
}

const RECORD_FORMS: [string, string, string] = ['запись', 'записи', 'записей']
const INSIGHT_FORMS: [string, string, string] = ['инсайт', 'инсайта', 'инсайтов']

/**
 * Исследование: сколько записей на него опирается.
 *
 * Считается всё, что может сослаться на исследование — JTBD, гипотезы,
 * разговоры, инсайты. Ноль означает, что исследование провели, а в работу оно
 * не попало.
 */
export function researchLinkBadge(counts: {
  jtbds: number
  hypotheses: number
  conversations: number
  insights: number
}): KnowledgeLinkBadge {
  const total = counts.jtbds + counts.hypotheses + counts.conversations + counts.insights
  if (total === 0) {
    return {
      label: 'ни на что не опирается',
      isGap: true,
      title: 'На это исследование не ссылается ни одна запись — оно проведено, но не использовано',
    }
  }
  return {
    label: pluralizeRu(total, RECORD_FORMS),
    isGap: false,
    title: [
      counts.jtbds > 0 && `JTBD: ${counts.jtbds}`,
      counts.hypotheses > 0 && `гипотез: ${counts.hypotheses}`,
      counts.conversations > 0 && `разговоров: ${counts.conversations}`,
      counts.insights > 0 && `инсайтов: ${counts.insights}`,
    ]
      .filter(Boolean)
      .join(' · '),
  }
}

/**
 * Разговор: сколько инсайтов из него извлечено.
 *
 * Транскрипт, из которого ничего не извлекли, — уже существующее правило
 * внимания на карточке продукта, здесь оно просто видно в строке.
 */
export function conversationLinkBadge(insightCount: number): KnowledgeLinkBadge {
  if (insightCount === 0) {
    return {
      label: 'инсайты не извлечены',
      isGap: true,
      title: 'Из этого разговора не сделано ни одного инсайта — он останется непрочитанным',
    }
  }
  return {
    label: pluralizeRu(insightCount, INSIGHT_FORMS),
    isGap: false,
    title: `Из разговора извлечено ${pluralizeRu(insightCount, INSIGHT_FORMS)}`,
  }
}

/**
 * Инсайт: к чему он привязан.
 *
 * Здесь перечисляются виды связей, а не их число: у инсайта каждая связь одна
 * (сегмент, задача, исследование, разговор, гипотеза), и «5 связей» сказало бы
 * меньше, чем «Сегмент · JTBD · Гипотеза».
 */
export function insightLinkBadge(links: {
  segment: boolean
  jtbd: boolean
  research: boolean
  conversation: boolean
  hypothesis: boolean
}): KnowledgeLinkBadge {
  const named = [
    links.segment && 'Сегмент',
    links.jtbd && 'JTBD',
    links.research && 'Исследование',
    links.conversation && 'Разговор',
    links.hypothesis && 'Гипотеза',
  ].filter((x): x is string => typeof x === 'string')

  if (named.length === 0) {
    return {
      label: 'ни к чему не привязан',
      isGap: true,
      title: 'Инсайт не привязан ни к сегменту, ни к задаче, ни к источнику — его никто не найдёт',
    }
  }
  return {
    label: named.join(' · '),
    isGap: false,
    title: `Привязан: ${named.join(', ').toLowerCase()}`,
  }
}
