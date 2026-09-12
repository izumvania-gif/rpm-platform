import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Статическая проверка взаимоисключающих классов (фаза 17).
//
// `shrink-0` и `truncate` на одном элементе спорят друг с другом: элементу,
// которому запрещено сжиматься, обрезать нечего. Он держит полную ширину
// содержимого и растягивает страницу — на /insights это было 180px
// горизонтального скролла (фаза 13). Глазами такое не ловится, потому что на
// коротком тексте всё выглядит нормально, а ломается только на длинном.
//
// Пара законна, если ширина задана явно (`w-28`, `max-w-[…]`, `basis-…`):
// тогда `truncate` обрезает по этой ширине, а `shrink-0` мешает flex её
// уменьшить. Такие места в коде есть и они правильные.

const ROOTS = ['app', 'components']
const WIDTH_TOKEN = /(^|\s)(w-|max-w-|basis-|min-w-\[)/

function walk(dir: string, out: string[]) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.tsx?$/.test(entry)) out.push(full)
  }
  return out
}

/** Все строковые литералы className в файле, вместе с номером строки. */
function classNames(source: string): { line: number; value: string }[] {
  const found: { line: number; value: string }[] = []
  const re = /className=(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\})/g
  let m: RegExpExecArray | null
  while ((m = re.exec(source))) {
    const value = m[1] ?? m[2] ?? m[3] ?? ''
    const line = source.slice(0, m.index).split('\n').length
    found.push({ line, value })
  }
  return found
}

describe('tailwind: взаимоисключающие классы', () => {
  it('shrink-0 и truncate не стоят вместе без явной ширины', () => {
    const offenders: string[] = []
    for (const root of ROOTS) {
      for (const file of walk(join(process.cwd(), root), [])) {
        const source = readFileSync(file, 'utf8')
        for (const { line, value } of classNames(source)) {
          const tokens = value.split(/\s+/)
          const hasShrink0 = tokens.includes('shrink-0')
          const hasTruncate = tokens.includes('truncate')
          if (hasShrink0 && hasTruncate && !WIDTH_TOKEN.test(' ' + value)) {
            offenders.push(`${file.replace(process.cwd() + '/', '')}:${line}  «${value}»`)
          }
        }
      }
    }
    expect(offenders, 'shrink-0 + truncate без ширины:\n' + offenders.join('\n')).toEqual([])
  })
})
