import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// «У каждой формы `*/new` есть `from`» (фаза 23 аудита 2.3).
//
// Аудит нашёл две формы (человек и департамент), у которых `redirectTo` не
// доходил до формы — на одной он стоял вне тега и рендерился как текст, на
// другой список не передавал `from`. Ни один тест этого не ловил: каждая
// форма проверяется своим спеком, а «правило для всех форм» не проверял никто.
// Этот тест — то самое правило: страница создания читает `searchParams.from`
// и отдаёт его форме как `redirectTo`, а «Новый …» на списке раздела несёт
// `?from=/<раздел>`. Исключения — только с причиной.

const ROOT = process.cwd()

/**
 * Страницы создания, у которых возврата по `from` нет намеренно.
 *
 * Причина у каждой своя, и она должна быть названа: без причины запись здесь —
 * просто способ выключить тест.
 */
const EXEMPT_NEW_PAGES: Record<string, string> = {
  'app/products/new/page.tsx':
    'Продукт — точка входа: после создания человек попадает на карточку или в мастер, ' +
    'возвращаться «в список» тут некуда, список продуктов сам ведёт к карточке.',
  'app/resources/new/page.tsx':
    'Ресурс живёт только на карточке продукта и возвращается туда; своего списка у него нет.',
  'app/pm/roadmap/new/page.tsx':
    'Формы «Доставки» возвращаются на свою вкладку с `?productId=`, а не по `from`: ' +
    'продукт здесь живёт в query, и потерять его важнее, чем потерять место в списке.',
  'app/pm/processes/new/page.tsx': 'См. app/pm/roadmap/new/page.tsx.',
  'app/pm/action-plans/new/page.tsx': 'См. app/pm/roadmap/new/page.tsx.',
}

function walk(dir: string, out: string[]) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

const newPages = walk(join(ROOT, 'app'), [])
  .map((file) => relative(ROOT, file))
  .filter((file) => /^app\/.*\/new\/page\.tsx$/.test(file))
  .sort()

/** `app/jtbd/new/page.tsx` → `/jtbd`; список лежит в `app/jtbd/page.tsx` или в группе `(list)`. */
function sectionOf(newPage: string): string {
  return '/' + newPage.replace(/^app\//, '').replace(/\/new\/page\.tsx$/, '')
}

function listPageOf(section: string): string | null {
  const base = join(ROOT, 'app', section.slice(1))
  for (const candidate of [join(base, 'page.tsx'), join(base, '(list)', 'page.tsx')]) {
    if (existsSync(candidate)) return candidate
  }
  return null
}

describe('every create form can return where it came from', () => {
  it('finds the create pages at all', () => {
    // Защита от тихого «нечего проверять», если структура папок сменится.
    expect(newPages.length).toBeGreaterThanOrEqual(10)
  })

  it('names a reason for every exemption, and no exemption is stale', () => {
    for (const [page, reason] of Object.entries(EXEMPT_NEW_PAGES)) {
      expect(reason.length, `${page}: причина исключения пуста`).toBeGreaterThan(20)
      expect(newPages, `${page} исключён, но такой страницы нет`).toContain(page)
    }
  })

  for (const page of newPages) {
    if (page in EXEMPT_NEW_PAGES) continue

    it(`${page} hands searchParams.from to the form as redirectTo`, () => {
      const source = readFileSync(join(ROOT, page), 'utf8')
      // Проп — внутри тега формы: `redirectTo={searchParams.from}` перед `/>`
      // или другим пропом, а не между тегами, где он станет текстом (именно
      // так и был сломан /people/new).
      expect(source).toMatch(/<\w+Form[\s\S]*?redirectTo=\{searchParams\.from\}[\s\S]*?\/>/)
    })

    it(`the «Новый …» link on ${sectionOf(page)} carries ?from=`, () => {
      const section = sectionOf(page)
      const listPage = listPageOf(section)
      expect(listPage, `у раздела ${section} нет страницы списка`).not.toBeNull()
      const source = readFileSync(listPage!, 'utf8')
      expect(source).toContain(`${section}/new?from=${section}`)
    })
  }
})
