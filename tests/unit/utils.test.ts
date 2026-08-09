import { describe, expect, it, vi } from 'vitest'
import { cn, isStale, pluralizeRu, slugify, transliterate } from '@/lib/utils'

describe('cn', () => {
  it('merges class names and resolves Tailwind conflicts', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })

  it('drops falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b')
  })
})

describe('transliterate', () => {
  it('maps Cyrillic characters to Latin', () => {
    expect(transliterate('Привет')).toBe('privet')
  })

  it('leaves Latin characters untouched (lowercased)', () => {
    expect(transliterate('Hello World')).toBe('hello world')
  })

  it('drops soft/hard signs while transliterating the rest', () => {
    expect(transliterate('объём')).toBe('obem')
  })
})

describe('slugify', () => {
  it('produces a URL-safe slug from Cyrillic text', () => {
    expect(slugify('Контроль сроков действия')).toBe('kontrol-srokov-deystviya')
  })

  it('collapses non-alphanumeric runs into a single hyphen', () => {
    expect(slugify('Hello,   World!!!')).toBe('hello-world')
  })

  it('strips leading and trailing hyphens', () => {
    expect(slugify('  --Test--  ')).toBe('test')
  })
})

describe('isStale', () => {
  it('is false for a date within the last 90 days', () => {
    const recent = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    expect(isStale(recent)).toBe(false)
  })

  it('is true for a date older than 90 days', () => {
    const old = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000)
    expect(isStale(old)).toBe(true)
  })

  it('is false exactly at the 90-day boundary', () => {
    vi.useFakeTimers()
    const now = new Date('2026-08-07T00:00:00.000Z')
    vi.setSystemTime(now)
    const boundary = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    expect(isStale(boundary)).toBe(false)
    vi.useRealTimers()
  })
})

describe('pluralizeRu', () => {
  const forms: [string, string, string] = ['продукт', 'продукта', 'продуктов']

  it('uses the singular form for 1, 21, 31...', () => {
    expect(pluralizeRu(1, forms)).toBe('1 продукт')
    expect(pluralizeRu(21, forms)).toBe('21 продукт')
  })

  it('uses the "few" form for 2-4 and 22-24...', () => {
    expect(pluralizeRu(2, forms)).toBe('2 продукта')
    expect(pluralizeRu(4, forms)).toBe('4 продукта')
    expect(pluralizeRu(23, forms)).toBe('23 продукта')
  })

  it('uses the "many" form for 0, 5-20, 25-30...', () => {
    expect(pluralizeRu(0, forms)).toBe('0 продуктов')
    expect(pluralizeRu(5, forms)).toBe('5 продуктов')
    expect(pluralizeRu(11, forms)).toBe('11 продуктов')
    expect(pluralizeRu(14, forms)).toBe('14 продуктов')
    expect(pluralizeRu(25, forms)).toBe('25 продуктов')
  })
})
