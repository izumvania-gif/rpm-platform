// Связь из разрыва (фаза 7 редизайна 2.1, plans/2.1-redesign-plan.md).
//
// Лента цепочки на карточке уже показывает, где связь оборвана: пустой слот
// рисуется пунктиром и говорит «ни одной». Но починить разрыв оттуда было
// нельзя — ссылка «+ добавить» уводила на форму создания или на редактирование
// записи, то есть с экрана. Человек видит проблему в одном месте, а решает её
// в другом, и возвращается уже без контекста.
//
// Здесь описано, какие разрывы чинятся ОДНИМ действием, и только они. Это
// главное правило модуля: слот получает пикер тогда и только тогда, когда
// между карточкой и целью ровно одно звено. Всё остальное — не «неудобно
// реализовать», а нечестно показать: кнопка «связать» обещает, что после
// клика разрыва не будет.
//
// Что осталось обычной ссылкой и почему:
//   • «Маркетинг» на карточке JTBD и гипотезы — RTB крепится к фиче, а не к
//     задаче. Выбрать RTB здесь значило бы создать связь, которой нет в
//     схеме, или молча привязать его к произвольной фиче.
//   • «Сегмент» на карточке фичи — сегмент виден через JTBD. Пока у фичи нет
//     задачи, привязывать нечего; когда есть — сегмент ставится на задаче.
//
// Чистый модуль: таблица разрывов и её правила проверяются юнит-тестами.
// Запросы кандидатов и записи связи — в lib/actions/chain-link.ts.

/** Разрыв, который чинится одним действием. Имя — «чья карточка → что ставим». */
export type ChainGapKind =
  | 'jtbd-segment'
  | 'jtbd-hypothesis'
  | 'jtbd-feature'
  | 'feature-jtbd'
  | 'feature-rtb'
  | 'hypothesis-segment'
  | 'hypothesis-jtbd'
  | 'hypothesis-feature'

/** Модель, чья карточка открыта. */
export type ChainAnchorModel = 'jtbd' | 'feature' | 'hypothesis'

/** Модель, которую выбирают или создают. */
export type ChainTargetModel = 'segment' | 'jtbd' | 'feature' | 'rtb' | 'hypothesis'

export interface ChainGapMeta {
  kind: ChainGapKind
  anchor: ChainAnchorModel
  target: ChainTargetModel
  /** Кнопка в пустом слоте. */
  pickLabel: string
  /** Подпись селекта — она же его доступное имя. */
  selectLabel: string
  /** Плейсхолдер селекта. */
  placeholder: string
  /**
   * Когда выбирать не из чего. Названо конкретно — «у продукта нет ни одного
   * сегмента» и «все сегменты уже привязаны» это разные ситуации, но обе
   * ведут в одно место: создать новую запись прямо здесь.
   */
  emptyCandidates: string
}

export const CHAIN_GAPS: ChainGapMeta[] = [
  {
    kind: 'jtbd-segment',
    anchor: 'jtbd',
    target: 'segment',
    pickLabel: 'связать с сегментом',
    selectLabel: 'Сегмент для этой задачи',
    placeholder: 'Выберите сегмент…',
    emptyCandidates: 'Свободных сегментов нет',
  },
  {
    kind: 'jtbd-hypothesis',
    anchor: 'jtbd',
    target: 'hypothesis',
    pickLabel: 'связать с гипотезой',
    selectLabel: 'Гипотеза для этой задачи',
    placeholder: 'Выберите гипотезу…',
    // Кандидаты — только гипотезы без задачи (см. lib/actions/chain-link.ts):
    // связать чужую значило бы отобрать её у другой задачи.
    emptyCandidates: 'Гипотез без задачи нет',
  },
  {
    kind: 'jtbd-feature',
    anchor: 'jtbd',
    target: 'feature',
    pickLabel: 'связать с фичей',
    selectLabel: 'Фича для этой задачи',
    placeholder: 'Выберите фичу…',
    emptyCandidates: 'Свободных фич нет',
  },
  {
    kind: 'feature-jtbd',
    anchor: 'feature',
    target: 'jtbd',
    pickLabel: 'связать с JTBD',
    selectLabel: 'JTBD для этой фичи',
    placeholder: 'Выберите JTBD…',
    emptyCandidates: 'Свободных JTBD нет',
  },
  {
    kind: 'feature-rtb',
    anchor: 'feature',
    target: 'rtb',
    pickLabel: 'связать с обещанием',
    selectLabel: 'Обещание для этой фичи',
    placeholder: 'Выберите обещание…',
    emptyCandidates: 'Свободных обещаний нет',
  },
  {
    kind: 'hypothesis-segment',
    anchor: 'hypothesis',
    target: 'segment',
    pickLabel: 'связать с сегментом',
    selectLabel: 'Сегмент для этой гипотезы',
    placeholder: 'Выберите сегмент…',
    emptyCandidates: 'У продукта нет сегментов',
  },
  {
    kind: 'hypothesis-jtbd',
    anchor: 'hypothesis',
    target: 'jtbd',
    pickLabel: 'связать с JTBD',
    selectLabel: 'JTBD для этой гипотезы',
    placeholder: 'Выберите JTBD…',
    emptyCandidates: 'У продукта нет JTBD',
  },
  {
    kind: 'hypothesis-feature',
    anchor: 'hypothesis',
    target: 'feature',
    pickLabel: 'связать с фичей',
    selectLabel: 'Фича для этой гипотезы',
    placeholder: 'Выберите фичу…',
    emptyCandidates: 'Свободных фич нет',
  },
]

/**
 * Кандидат в пикере. Тип живёт здесь, а не рядом с запросом: модуль
 * lib/actions/chain-link.ts объявлен `'use server'`, и держать в нём что-то,
 * кроме асинхронных функций, — против правила таких модулей.
 */
export interface ChainCandidate {
  id: string
  /** Короткая подпись для селекта — при необходимости ключевая фраза. */
  label: string
  /** Нетронутый текст, для title. */
  fullLabel: string
}

export function chainGapByKind(kind: ChainGapKind): ChainGapMeta {
  const meta = CHAIN_GAPS.find((gap) => gap.kind === kind)
  // Громко, а не пустым пикером: опечатка в kind не должна выглядеть как
  // «связывать не с чем», это неотличимо от пустого продукта.
  if (!meta) throw new Error(`Unknown chain gap kind: ${kind}`)
  return meta
}

/** Маршрут модуля цели. У обещаний он исторически `/marketing`, а не `/rtb`. */
const TARGET_ROUTES: Record<ChainTargetModel, string> = {
  segment: '/segments',
  jtbd: '/jtbd',
  feature: '/features',
  rtb: '/marketing',
  hypothesis: '/hypotheses',
}

/** Карточка только что связанной записи — на неё ведёт оптимистичная фишка. */
export function chainGapItemHref(target: ChainTargetModel, id: string): string {
  return `${TARGET_ROUTES[target]}/${id}`
}

/**
 * Ссылка на форму создания записи цели — запасной путь для случая, когда
 * пикер не помогает: не «выбрать существующую», а «завести с полным набором
 * полей». Инлайн-создание рядом просит минимум, здесь остальное.
 */
export function chainGapFullFormHref(target: ChainTargetModel, productId: string): string {
  return `${TARGET_ROUTES[target]}/new?productId=${productId}`
}
