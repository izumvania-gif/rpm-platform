import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { KNOWLEDGE_TABS, isKnowledgeTabActive } from '@/lib/knowledge-nav'

describe('the knowledge tabs', () => {
  // Порядок — как знание появляется: исследование, разговор внутри него,
  // инсайт из разговора. Это утверждение о методе, а не о вкусе.
  it('lists the three sections in the order knowledge appears', () => {
    expect(KNOWLEDGE_TABS.map((t) => t.label)).toEqual(['Исследования', 'Разговоры', 'Инсайты'])
  })

  // Маршруты остались прежними: общий префикс `/knowledge` сломал бы сотню
  // существующих ссылок ради адресной строки.
  it('keeps the existing routes', () => {
    expect(KNOWLEDGE_TABS.map((t) => t.href)).toEqual(['/research', '/conversations', '/insights'])
  })

  it('gives every tab a real page', () => {
    for (const tab of KNOWLEDGE_TABS) {
      const file = join(process.cwd(), 'app', tab.href.replace(/^\//, ''), 'page.tsx')
      expect(existsSync(file), `${tab.href} → ${file}`).toBe(true)
    }
  })
})

describe('isKnowledgeTabActive', () => {
  const research = KNOWLEDGE_TABS[0]

  it('stays lit on the tab’s own record pages', () => {
    expect(isKnowledgeTabActive(research, '/research')).toBe(true)
    expect(isKnowledgeTabActive(research, '/research/abc')).toBe(true)
    expect(isKnowledgeTabActive(research, '/research/abc/edit')).toBe(true)
  })

  it('does not light up on a sibling tab', () => {
    expect(isKnowledgeTabActive(research, '/insights')).toBe(false)
    expect(isKnowledgeTabActive(KNOWLEDGE_TABS[2], '/research')).toBe(false)
  })
})
