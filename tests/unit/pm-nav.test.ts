import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PM_DEFAULT_TAB, PM_TABS, isPmTabActive, pmTabHref } from '@/lib/pm-nav'

describe('the delivery tabs', () => {
  // Пять, а не четыре: план перечислял «Роадмап · Гант · Процессы ·
  // Экшн-планы» и не упомянул «Команду», но секция существует и работает.
  // Список записан явно, чтобы шестая вкладка не появилась молча.
  it('lists exactly the five sections', () => {
    expect(PM_TABS.map((t) => t.label)).toEqual([
      'Роадмап',
      'Гант',
      'Процессы',
      'Экшн-планы',
      'Команда',
    ])
  })

  it('lands on the roadmap by default', () => {
    expect(PM_DEFAULT_TAB).toBe('/pm/roadmap')
  })

  /**
   * Каждой вкладке — свой маршрут. Пункт меню без страницы обещает то, чего
   * нет; ту же проверку делает tests/unit/nav-chain.test.ts для всего меню, но
   * здесь она стоит рядом с самим списком.
   */
  it('gives every tab a real page', () => {
    for (const tab of PM_TABS) {
      const file = join(process.cwd(), 'app', tab.href.replace(/^\//, ''), 'page.tsx')
      expect(existsSync(file), `${tab.href} → ${file}`).toBe(true)
    }
  })
})

describe('pmTabHref', () => {
  // Продукт «Доставки» живёт в query, а не в cookie активного продукта, и
  // потерять его при смене вкладки значило бы молча сменить продукт.
  it('carries the product across tabs', () => {
    expect(pmTabHref('/pm/gantt', 'p1')).toBe('/pm/gantt?productId=p1')
  })

  it('leaves the address clean when no product is chosen', () => {
    expect(pmTabHref('/pm/gantt')).toBe('/pm/gantt')
    expect(pmTabHref('/pm/gantt', null)).toBe('/pm/gantt')
  })
})

describe('isPmTabActive', () => {
  const roadmap = PM_TABS[0]

  it('stays lit on the tab’s own nested pages', () => {
    expect(isPmTabActive(roadmap, '/pm/roadmap')).toBe(true)
    expect(isPmTabActive(roadmap, '/pm/roadmap/abc/edit')).toBe(true)
    expect(isPmTabActive(roadmap, '/pm/roadmap/new')).toBe(true)
  })

  it('does not light up on a sibling tab', () => {
    expect(isPmTabActive(roadmap, '/pm/gantt')).toBe(false)
    expect(isPmTabActive(PM_TABS[1], '/pm/roadmap')).toBe(false)
  })
})
