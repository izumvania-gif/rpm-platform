import { describe, expect, it, vi } from 'vitest'
import { cn, isStale, slugify, transliterate } from '@/lib/utils'

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
