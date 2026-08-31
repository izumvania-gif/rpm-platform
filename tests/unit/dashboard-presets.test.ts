import { describe, expect, it } from 'vitest'
import {
  activePresetId,
  applyPreset,
  DASHBOARD_PRESETS,
  type DashboardPreset,
} from '@/lib/dashboard-presets'
import { dashboardWidgetDefs } from '@/lib/dashboard-widgets'

const byId = (id: string) => DASHBOARD_PRESETS.find((p) => p.id === id)!

describe('состав пресетов', () => {
  // Тот же сторож, что и `nav-chain.test.ts` для меню: пресет не должен уметь
  // молча сослаться на виджет, которого больше нет. Отбрасывание неизвестных
  // id в `applyPreset` спасёт пользователя, но скроет опечатку — поэтому
  // опечатку ловим здесь.
  it('ссылается только на существующие виджеты', () => {
    const known = new Set(dashboardWidgetDefs.map((d) => d.id))
    for (const preset of DASHBOARD_PRESETS) {
      for (const id of preset.widgetIds) {
        expect(known, `пресет «${preset.label}» ссылается на «${id}»`).toContain(id)
      }
    }
  })

  it('не содержит пустых пресетов и повторов внутри одного', () => {
    for (const preset of DASHBOARD_PRESETS) {
      expect(preset.widgetIds.length).toBeGreaterThan(0)
      expect(new Set(preset.widgetIds).size).toBe(preset.widgetIds.length)
    }
  })

  it('у пресетов уникальные id', () => {
    const ids = DASHBOARD_PRESETS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  // «Всё» обязано означать буквально всё, иначе название врёт.
  it('«Всё» перечисляет каждый виджет реестра', () => {
    expect([...byId('all').widgetIds].sort()).toEqual(dashboardWidgetDefs.map((d) => d.id).sort())
  })

  // Смысл разделения: аналитика продукта против личных лент. Если пресеты
  // начнут пересекаться, различие, ради которого они заведены, исчезнет.
  it('«Состояние дискавери» и «Личный рабочий стол» не пересекаются', () => {
    const discovery = new Set(byId('discovery').widgetIds)
    const overlap = byId('desk').widgetIds.filter((id) => discovery.has(id))
    expect(overlap).toEqual([])
  })

  it('вместе они покрывают весь реестр', () => {
    const union = new Set([...byId('discovery').widgetIds, ...byId('desk').widgetIds])
    expect([...union].sort()).toEqual(dashboardWidgetDefs.map((d) => d.id).sort())
  })
})

describe('applyPreset', () => {
  it('ставит виджеты пресета первыми и видимыми, в порядке пресета', () => {
    const layout = applyPreset(byId('desk'))
    expect(layout.slice(0, 3)).toEqual([
      { id: 'pinned', visible: true },
      { id: 'recently-viewed', visible: true },
      { id: 'activity', visible: true },
    ])
  })

  // Скрытым, а не выброшенным: иначе спрятанный виджет стало бы нечем вернуть
  // из настроек.
  it('оставляет остальные виджеты в раскладке, но скрытыми', () => {
    const layout = applyPreset(byId('discovery'))
    expect(layout).toHaveLength(dashboardWidgetDefs.length)
    const hidden = layout.filter((w) => !w.visible).map((w) => w.id)
    expect(hidden.sort()).toEqual(['activity', 'pinned', 'recently-viewed'])
  })

  it('«Всё» не оставляет ничего скрытым', () => {
    expect(applyPreset(byId('all')).every((w) => w.visible)).toBe(true)
  })

  it('молча отбрасывает виджет, которого нет в реестре', () => {
    const stale: DashboardPreset = {
      id: 'stale',
      label: 'Устаревший',
      description: '',
      widgetIds: ['pinned', 'gaps-summary'], // gaps-summary удалён в фазе 10
    }
    const layout = applyPreset(stale)
    expect(layout.map((w) => w.id)).not.toContain('gaps-summary')
    expect(layout.filter((w) => w.visible).map((w) => w.id)).toEqual(['pinned'])
  })
})

describe('activePresetId', () => {
  it('узнаёт раскладку, собранную пресетом', () => {
    for (const preset of DASHBOARD_PRESETS) {
      expect(activePresetId(applyPreset(preset))).toBe(preset.id)
    }
  })

  it('не узнаёт раскладку, которую человек потом поправил', () => {
    const layout = applyPreset(byId('discovery'))
    const edited = layout.map((w) => (w.id === 'pinned' ? { ...w, visible: true } : w))
    expect(activePresetId(edited)).toBeNull()
  })

  // Порядок видимых — часть пресета, поэтому перестановка снимает отметку.
  it('различает пресеты по порядку видимых виджетов', () => {
    const layout = applyPreset(byId('desk'))
    const swapped = [layout[1], layout[0], ...layout.slice(2)]
    expect(activePresetId(swapped)).toBeNull()
  })

  // А порядок скрытых пресет не задаёт — значит, и отметку снимать не должен.
  it('не смотрит на порядок скрытых виджетов', () => {
    const layout = applyPreset(byId('discovery'))
    const visible = layout.filter((w) => w.visible)
    const hidden = layout.filter((w) => !w.visible).reverse()
    expect(activePresetId([...visible, ...hidden])).toBe('discovery')
  })

  it('возвращает null, когда всё скрыто', () => {
    const layout = dashboardWidgetDefs.map((d) => ({ id: d.id, visible: false }))
    expect(activePresetId(layout)).toBeNull()
  })
})
