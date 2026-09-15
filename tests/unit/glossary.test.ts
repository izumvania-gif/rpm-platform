import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GLOSSARY } from '@/lib/glossary'

// Словарь не описывает того, чего в интерфейсе нет (фаза 27 плана 2.4).
//
// Тест-правило того же рода, что vocabulary и nav-chain: каждое понятие
// словаря обязано встречаться в исходниках интерфейса под своим именем.
// Понятие, которого не найти ни в подписях, ни в модулях, — либо словарь
// придумал термин, либо интерфейс его переименовал, и подсказка объясняет
// слово, которого человек не видит.

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) walk(path, out)
    else if (/\.tsx?$/.test(entry)) out.push(path)
  }
  return out
}

const ROOT = join(__dirname, '..', '..')
const SOURCE = ['app', 'components', 'lib']
  .flatMap((dir) => walk(join(ROOT, dir)))
  .filter((path) => !path.endsWith('/lib/glossary.ts'))
  .map((path) => readFileSync(path, 'utf8'))
  .join('\n')

describe('glossary', () => {
  it('names only concepts the interface itself names', () => {
    for (const [term, entry] of Object.entries(GLOSSARY)) {
      expect(SOURCE.includes(entry.label), `«${entry.label}» (${term}) is not in the UI`).toBe(true)
    }
  })

  it('keeps every hint to one sentence that adds to the label', () => {
    for (const [term, entry] of Object.entries(GLOSSARY)) {
      expect(entry.hint.trim().length, term).toBeGreaterThan(entry.label.length)
      // Одна фраза: без абзацев из гайда.
      expect(entry.hint.split(/(?<=[.!?])\s+(?=[А-ЯA-Z«])/).length, term).toBeLessThanOrEqual(2)
      expect(entry.hint.length, term).toBeLessThanOrEqual(160)
    }
  })
})
