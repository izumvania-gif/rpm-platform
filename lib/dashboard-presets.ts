import type { DashboardWidgetLayout } from '@/lib/client-storage'
import { dashboardWidgetDefs, type DashboardWidgetDef } from '@/lib/dashboard-widgets'

// Пресеты сетки виджетов — последний незакрытый пункт фазы 10 редизайна 2.1.
//
// Почему они НЕ названы по ролям, хотя вопрос в плане звучал как «состав по
// роли». Роль в этом приложении уже отвечает за то, какую страницу человек
// открывает: `/pm`, `/cpo`, `/marketing-hub`, `/sales-hub`, `/public` — это
// витрины, каждая со своим составом (работа 2.0). Сделать роль ещё и
// параметром главной значило бы завести третий источник правды о том, что
// человек видит, — ровно то возражение, из-за которого фаза 10 эту вещь и не
// стала делать.
//
// Что осталось настоящим после вычитания ролей: на главной живут два разных
// вида содержимого, и они нужны в разные моменты. Аналитика продукта
// (покрытие, воронка, частота) отвечает на «как идут дела», личные ленты
// (закреплённое, недавнее, активность) — на «чем занимался я». Руководителю
// продукта чужие закладки не говорят ничего, а человеку, вернувшемуся из
// отпуска, воронка гипотез — во вторую очередь. Вот это различие и разложено
// в пресеты; оно про содержимое, а не про должность, и потому не врёт.
//
// Пресет — ДЕЙСТВИЕ, а не режим: он один раз записывает раскладку в то же
// хранилище браузера, которым владеет сетка, и на этом заканчивается. Никакой
// «выбранной роли» нигде не сохраняется, поэтому после применения человек
// продолжает править состав руками, как и раньше.
export interface DashboardPreset {
  id: string
  label: string
  description: string
  /** Видимые виджеты, в том порядке, в котором пресет их показывает. */
  widgetIds: string[]
}

export const DASHBOARD_PRESETS: DashboardPreset[] = [
  {
    id: 'all',
    label: 'Всё',
    description: 'Аналитика и личные ленты — состав по умолчанию',
    widgetIds: [
      'jtbd-coverage',
      'hypothesis-funnel',
      'research-cadence',
      'recently-viewed',
      'pinned',
      'activity',
    ],
  },
  {
    id: 'discovery',
    label: 'Состояние дискавери',
    description: 'Только показатели продукта, без личных лент',
    widgetIds: ['jtbd-coverage', 'hypothesis-funnel', 'research-cadence'],
  },
  {
    id: 'desk',
    label: 'Личный рабочий стол',
    description: 'Что я держу в фокусе и что изменилось',
    widgetIds: ['pinned', 'recently-viewed', 'activity'],
  },
]

/**
 * Раскладка по пресету: перечисленные виджеты идут первыми и видимыми, в
 * порядке пресета; всё остальное из реестра — следом и скрытым.
 *
 * Скрытым, а не выброшенным: сетка рисует только видимые, но настройки должны
 * показать и остальные, иначе спрятанный пресетом виджет стало бы нечем
 * вернуть.
 *
 * Неизвестные реестру id молча отбрасываются — по той же причине, по которой
 * их выбрасывает `reconcileDashboardLayout`: пресет мог пережить удаление
 * виджета. Юнит-тест при этом требует, чтобы в самих пресетах таких id не
 * было, — то есть отбрасывание защищает от чужих данных, а не прикрывает
 * опечатку в этом файле.
 */
export function applyPreset(
  preset: DashboardPreset,
  defs: DashboardWidgetDef[] = dashboardWidgetDefs
): DashboardWidgetLayout[] {
  const known = new Set(defs.map((d) => d.id))
  const chosen = preset.widgetIds.filter((id) => known.has(id))
  const chosenSet = new Set(chosen)
  return [
    ...chosen.map((id) => ({ id, visible: true })),
    ...defs.filter((d) => !chosenSet.has(d.id)).map((d) => ({ id: d.id, visible: false })),
  ]
}

/**
 * Какому пресету соответствует текущая раскладка, если какому-нибудь
 * соответствует. Нужно, чтобы настройки могли отметить активный, а не
 * предлагать три одинаково безучастные кнопки.
 *
 * Сравнивается ровно то, что пресет и задаёт: список видимых виджетов в их
 * порядке. Порядок скрытых не сравнивается — пресет о нём ничего не говорит,
 * и требовать совпадения значило бы терять отметку из-за перестановки
 * невидимого.
 */
export function activePresetId(
  layout: DashboardWidgetLayout[],
  presets: DashboardPreset[] = DASHBOARD_PRESETS,
  defs: DashboardWidgetDef[] = dashboardWidgetDefs
): string | null {
  const known = new Set(defs.map((d) => d.id))
  const visible = layout.filter((w) => w.visible && known.has(w.id)).map((w) => w.id)
  const match = presets.find((preset) => {
    const expected = preset.widgetIds.filter((id) => known.has(id))
    return expected.length === visible.length && expected.every((id, i) => id === visible[i])
  })
  return match?.id ?? null
}
