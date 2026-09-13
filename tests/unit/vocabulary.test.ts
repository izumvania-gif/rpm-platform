import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// Один словарь (фаза 19, plans/2.3-scenario-audit-plan.md).
//
// Аудит нашёл у одной сущности три имени сразу: «Обещания» в меню, «Маркетинг»
// на странице и карточке продукта, «RTB» на кнопках. Так получается не по
// злому умыслу, а по фазам: 1.0 назвал раздел «Маркетинг», 2.1 переименовал
// пункт меню, код всегда звал модель RTB — и каждый новый экран брал слово из
// того слоя, который был под рукой. Правило проще памяти: в пользовательских
// строках сущность называется «обещание», и точка.
//
// Проверяются только строки, которые видит человек: литералы в кавычках и
// текст JSX. Идентификаторы (`createRTBQuick`, `prisma.rTB`, `type RTB`) и
// комментарии остаются как есть — переименовывать модель ради словаря значило
// бы тронуть схему и сто вызовов ради слова, которого пользователь не видит.
//
// Два разрешённых исключения:
//  - `app/marketing/page.tsx` — подзаголовок называет аббревиатуру один раз,
//    для тех, кто знает термин;
//  - «Маркетинг: что сказать сегменту» — заголовок витрины /marketing-hub и
//    пункт переключателя представлений. Это отдел, а не сущность, и слово
//    стоит не само по себе, а с уточнением.

const ROOTS = ['app', 'components', 'lib']
const ALLOWED_FILES = new Set(['app/marketing/page.tsx'])

function walk(dir: string, out: string[]) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.tsx?$/.test(entry)) out.push(full)
  }
  return out
}

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
}

/** Строковые литералы и текст между тегами JSX — то, что попадает на экран. */
function userFacingStrings(source: string): string[] {
  const found: string[] = []
  const literal = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g
  let m: RegExpExecArray | null
  while ((m = literal.exec(source))) found.push(m[1] ?? m[2] ?? m[3] ?? '')
  const jsxText = />([^<>{}]+)</g
  while ((m = jsxText.exec(source))) found.push(m[1])
  return found
}

function offends(text: string): string | null {
  if (/\bRTB\b/.test(text)) return 'RTB'
  // «Маркетинг» как самостоятельное имя раздела или сущности. С двоеточием
  // («Маркетинг: что сказать сегменту») — это витрина, ей можно.
  if (/(^|[«"'\s(])Маркетинг(?=$|[»"'\s).,])/.test(text) && !/Маркетинг:/.test(text)) {
    return 'Маркетинг'
  }
  return null
}

describe('словарь: обещание называется одним словом', () => {
  it('в пользовательских строках нет «RTB» и «Маркетинг» как имени раздела', () => {
    const offenders: string[] = []
    for (const root of ROOTS) {
      for (const file of walk(join(process.cwd(), root), [])) {
        const rel = relative(process.cwd(), file)
        if (ALLOWED_FILES.has(rel)) continue
        const source = stripComments(readFileSync(file, 'utf8'))
        for (const text of userFacingStrings(source)) {
          const word = offends(text)
          if (word) offenders.push(`${rel}: «${text.trim().slice(0, 70)}» (${word})`)
        }
      }
    }
    expect(offenders, 'слово не из словаря:\n' + offenders.join('\n')).toEqual([])
  })
})
