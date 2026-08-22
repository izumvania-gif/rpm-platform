import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CHAIN, GROUPS, OVERVIEW, allNavNodes, isNodeActive } from '@/lib/nav-chain'

describe('the chain itself', () => {
  // Порядок звеньев — это методология, а не вкус. Тест стоит здесь, чтобы
  // перестановка «чтобы красивее» не прошла молча.
  it('keeps the discovery order', () => {
    expect(CHAIN.map((n) => n.label)).toEqual(['Сегменты', 'JTBD', 'Гипотезы', 'Фичи', 'Обещания'])
  })

  it('keeps the RTB route even though the label changed', () => {
    expect(CHAIN.find((n) => n.label === 'Обещания')?.href).toBe('/marketing')
  })
})

describe('isNodeActive', () => {
  it('matches the section and everything inside it', () => {
    const segments = CHAIN[0]
    expect(isNodeActive(segments, '/segments')).toBe(true)
    expect(isNodeActive(segments, '/segments/abc')).toBe(true)
    expect(isNodeActive(segments, '/segments/abc/edit')).toBe(true)
    expect(isNodeActive(segments, '/jtbd')).toBe(false)
  })

  // «Обзор» — единственный href, который является префиксом всего остального.
  it('does not light up Обзор on every page', () => {
    expect(isNodeActive(OVERVIEW, '/')).toBe(true)
    expect(isNodeActive(OVERVIEW, '/segments')).toBe(false)
  })

  it('lights up a parent when one of its children is open', () => {
    const promises = CHAIN.find((n) => n.label === 'Обещания')!
    expect(isNodeActive(promises, '/competitors')).toBe(true)
    const knowledge = GROUPS.find((n) => n.label === 'База знаний')!
    expect(isNodeActive(knowledge, '/insights/xyz')).toBe(true)
  })
})

/**
 * Инвентаризация маршрутов.
 *
 * План требует «сверку списком по всем 78 страницам» — что ни один маршрут не
 * потерялся при перекройке меню. Сверка глазами такое пропускает и, главное,
 * не повторяется: этот тест делает её на каждом прогоне.
 *
 * Правило: у каждого маршрута-раздела верхнего уровня должен быть пункт меню.
 * Всё остальное — карточки записей, формы, мастера, витрины ролей — исключено
 * явно и с причиной, а не молчаливо.
 */
function routesFromApp(): string[] {
  const appDir = join(process.cwd(), 'app')
  const routes: string[] = []

  const walk = (dir: string, segments: string[]) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (!statSync(full).isDirectory()) {
        if (entry === 'page.tsx') routes.push('/' + segments.join('/'))
        continue
      }
      // Группы маршрутов Next (в скобках) не участвуют в URL.
      if (entry.startsWith('(') && entry.endsWith(')')) walk(full, segments)
      else walk(full, [...segments, entry])
    }
  }
  walk(appDir, [])
  return routes
}

/** Маршруты, которым пункт меню не положен, каждый с причиной. */
const EXEMPT: { test: (route: string) => boolean; why: string }[] = [
  { test: (r) => r.includes('['), why: 'карточка записи — попадают по ссылке из списка' },
  { test: (r) => r.endsWith('/new') || r.endsWith('/edit'), why: 'форма' },
  {
    test: (r) => ['/cpo', '/marketing-hub', '/sales-hub', '/public', '/pm'].includes(r),
    why: 'витрина роли — за переключателем ролей (у /pm есть и свой пункт «Доставка»)',
  },
  { test: (r) => r === '/search' || r === '/inbox', why: 'инструмент в шапке, не раздел' },
  { test: (r) => r.startsWith('/reports/'), why: 'подстраница «Отчётов»' },
  { test: (r) => r === '/login', why: 'вне приложения' },
]

describe('route inventory', () => {
  const navHrefs = new Set(allNavNodes().map((n) => n.href))

  it('gives every top-level section a place in the menu', () => {
    const orphans = routesFromApp().filter(
      (route) => !navHrefs.has(route) && !EXEMPT.some((e) => e.test(route))
    )
    expect(orphans).toEqual([])
  })

  it('points every menu entry at a route that exists', () => {
    const routes = new Set(routesFromApp())
    const dangling = [...navHrefs].filter((href) => !routes.has(href))
    expect(dangling).toEqual([])
  })
})
