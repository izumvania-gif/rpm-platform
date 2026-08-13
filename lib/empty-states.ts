// Teaching empty states (plans/2.0-product-leap-plan.md, A5).
//
// Before this, all ~60 empty states in the app were a dead-end sentence
// ("Пока нет сегментов.") — they told the user what was missing but not what
// the entity is for, what a good one looks like, or what to do next. A new
// product rendered as a stack of such sentences, which reads as a chore list
// rather than a starting point.
//
// Each entry answers three questions in the user's own vocabulary: what this
// is for (`what`), what a real one looks like (`examples` — concrete and
// domain-flavoured, not "Пример 1/Пример 2"), and what to do now (`action`).
// Kept as plain data next to lib/module-meta.ts rather than inlined per page
// so the same copy is reused wherever a module shows up empty (its own list
// page, the product detail page, /pm sections).

export interface EmptyStateContent {
  /** Why this entity exists, one sentence, no jargon. */
  what: string
  /** Two or three concrete instances a PM would recognise. */
  examples: string[]
  actionLabel: string
  /** Route for the primary action; `:productId` is substituted at render. */
  actionHref: string
}

export const emptyStates: Record<string, EmptyStateContent> = {
  '/products': {
    what: 'Продукт — верхний уровень всего остального: сегменты, JTBD, гипотезы и роадмап живут внутри него.',
    examples: ['Рутокен CLM', 'Рутокен ЭЦП 3.0'],
    actionLabel: 'Создать продукт',
    actionHref: '/products/new',
  },
  '/segments': {
    what: 'Сегмент — группа клиентов, у которой задачи и ограничения общие внутри группы и разные между группами.',
    examples: ['Банки топ-30', 'Госзаказчики', 'СМБ-интеграторы'],
    actionLabel: 'Добавить сегмент',
    actionHref: '/segments/new',
  },
  '/jtbd': {
    what: 'JTBD — задача, которую клиент решает вашим продуктом. Формулируется от клиента, а не от фичи.',
    examples: [
      'Выпустить сертификат сотруднику за один визит',
      'Отозвать доступ уволенного в тот же день',
    ],
    actionLabel: 'Добавить JTBD',
    actionHref: '/jtbd/new',
  },
  '/hypotheses': {
    what: 'Гипотеза — проверяемое утверждение о клиенте или рынке. Живёт от черновика до подтверждения или опровержения.',
    examples: [
      'Если выдавать сертификат без визита в офис, банки сократят онбординг вдвое',
      'Госзаказчики не купят решение без сертификата ФСТЭК',
    ],
    actionLabel: 'Добавить гипотезу',
    actionHref: '/hypotheses/new',
  },
  '/research': {
    what: 'Исследование — источник, на который вы ссылаетесь, когда подтверждаете JTBD или гипотезу.',
    examples: ['Серия интервью с банками, Q3', 'Опрос интеграторов о внедрении'],
    actionLabel: 'Добавить исследование',
    actionHref: '/research/new',
  },
  '/conversations': {
    what: 'Разговор — конкретное интервью с клиентом. Из него вырастают инсайты, а из инсайтов — JTBD и гипотезы.',
    examples: ['Интервью с ИБ-директором банка', 'CustDev с интегратором'],
    actionLabel: 'Записать разговор',
    actionHref: '/conversations/new',
  },
  '/insights': {
    what: 'Инсайт — одна цитата или один вывод. Атомарный: одна мысль на запись, со ссылкой на источник.',
    examples: [
      '«Мы не можем ждать неделю выпуска сертификата — люди простаивают»',
      'Решение о закупке принимает ИБ, а не ИТ',
    ],
    actionLabel: 'Добавить инсайт',
    actionHref: '/insights/new',
  },
  '/competitors': {
    what: 'Конкурент — с кем вас сравнивают в сделке. Позиционирование важнее списка фич.',
    examples: ['КриптоПро', 'Аладдин Р.Д.'],
    actionLabel: 'Добавить конкурента',
    actionHref: '/competitors/new',
  },
  '/features': {
    what: 'Фича — что продукт умеет. Ценность появляется, когда фича привязана к JTBD, который она закрывает.',
    examples: ['Удалённый выпуск сертификата', 'Массовый отзыв доступов'],
    actionLabel: 'Добавить фичу',
    actionHref: '/features/new',
  },
  '/marketing': {
    what: 'RTB (reason to believe) — почему клиент должен поверить обещанию. Опирается на конкретную фичу.',
    examples: ['Сертификат ФСТЭК на СКЗИ', 'Внедрение за 2 недели в 30 банках'],
    actionLabel: 'Добавить RTB',
    actionHref: '/marketing/new',
  },
  '/people': {
    what: 'Человек — участник команды продукта. Нужен, чтобы назначать ответственных за пункты роадмапа и шаги процесса.',
    examples: ['Product manager', 'Технический писатель'],
    actionLabel: 'Добавить человека',
    actionHref: '/people/new',
  },
  '/departments': {
    what: 'Департамент группирует продукты в портфеле — по нему CPO смотрит роадмап и загрузку.',
    examples: ['Аппаратные решения', 'Облачные сервисы'],
    actionLabel: 'Добавить департамент',
    actionHref: '/departments/new',
  },
  '/pm/roadmap': {
    what: 'Пункт роадмапа — что вы собираетесь сделать и когда. Со сроками попадает на диаграмму Ганта.',
    examples: ['Запустить онбординг v2 — 2026 Q4', 'Выпуск 2.5 (веха) — 30 сентября'],
    actionLabel: 'Добавить пункт',
    actionHref: '/pm/roadmap/new?productId=:productId',
  },
  '/pm/team': {
    what: 'Команда продукта — явно добавленные люди плюс те, у кого уже есть назначенный пункт роадмапа или шаг процесса.',
    examples: ['Product manager', 'Ведущий разработчик'],
    actionLabel: 'Добавить человека',
    actionHref: '/people/new',
  },
  '/pm/action-plans': {
    what: 'Экшн-план — заранее написанное «что делать», когда случится предсказуемая нештатная ситуация.',
    examples: ['Крупный клиент публично жалуется', 'Конкурент выпустил аналог'],
    actionLabel: 'Добавить план',
    actionHref: '/pm/action-plans/new?productId=:productId',
  },
  '/pm/processes': {
    what: 'Процесс — кто что делает и кому передаёт дальше. Рисуется схемой из шагов и связей.',
    examples: ['Запуск маркетинговой кампании', 'Обработка инцидента'],
    actionLabel: 'Добавить процесс',
    actionHref: '/pm/processes/new?productId=:productId',
  },
}

export function emptyStateFor(key: string, productId?: string): EmptyStateContent | undefined {
  const content = emptyStates[key]
  if (!content) return undefined
  if (!productId) return content
  return { ...content, actionHref: content.actionHref.replace(':productId', productId) }
}
