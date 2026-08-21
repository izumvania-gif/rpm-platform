import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  optionalDate,
  optionalEnum,
  optionalNumber,
  optionalString,
  toLines,
  toTagsArray,
} from '@/lib/validation'

describe('optionalString', () => {
  const schema = z.object({ value: optionalString() })

  it('treats an empty string as absent', () => {
    expect(schema.parse({ value: '' })).toEqual({ value: undefined })
  })

  it('trims and keeps a real value', () => {
    expect(schema.parse({ value: '  hello  ' })).toEqual({ value: 'hello' })
  })
})

describe('optionalNumber', () => {
  const schema = z.object({ value: optionalNumber(z.coerce.number().min(0).max(100)) })

  it('treats an empty string as absent', () => {
    expect(schema.parse({ value: '' })).toEqual({ value: undefined })
  })

  it('coerces and keeps a real value', () => {
    expect(schema.parse({ value: '42' })).toEqual({ value: 42 })
  })

  it('still enforces the wrapped schema constraints', () => {
    expect(() => schema.parse({ value: '101' })).toThrow()
  })
})

describe('optionalDate', () => {
  const schema = z.object({ value: optionalDate() })

  it('treats an empty string as absent', () => {
    expect(schema.parse({ value: '' })).toEqual({ value: undefined })
  })

  it('coerces a real date string', () => {
    const result = schema.parse({ value: '2026-01-15' })
    expect(result.value).toBeInstanceOf(Date)
  })
})

describe('optionalEnum', () => {
  const Stance = z.enum(['SUPPORTS', 'CONTRADICTS'])
  const schema = z.object({ value: optionalEnum(Stance) })

  it('treats an empty string as absent rather than as a validation failure', () => {
    // Это и есть причина существования хелпера: пустой <select> означает
    // «сторона не выбрана», а не «пользователь ошибся».
    expect(schema.parse({ value: '' })).toEqual({ value: undefined })
  })

  it('treats null and undefined as absent', () => {
    expect(schema.parse({ value: null })).toEqual({ value: undefined })
    expect(schema.parse({})).toEqual({ value: undefined })
  })

  it('passes a real member through', () => {
    expect(schema.parse({ value: 'SUPPORTS' })).toEqual({ value: 'SUPPORTS' })
  })

  it('still rejects a value that is not a member', () => {
    expect(schema.safeParse({ value: 'MAYBE' }).success).toBe(false)
  })
})

describe('toTagsArray', () => {
  it('returns an empty array for undefined', () => {
    expect(toTagsArray(undefined)).toEqual([])
  })

  it('returns an empty array for an empty string', () => {
    expect(toTagsArray('')).toEqual([])
  })

  it('splits, trims, and drops empty entries', () => {
    expect(toTagsArray('a, b ,, c')).toEqual(['a', 'b', 'c'])
  })
})

describe('toLines', () => {
  it('returns an empty array for undefined', () => {
    expect(toLines(undefined)).toEqual([])
  })

  it('returns an empty array for an empty string', () => {
    expect(toLines('')).toEqual([])
  })

  it('splits on newlines, trims, drops empty lines, and preserves order', () => {
    expect(toLines('Step one\n  Step two  \n\nStep three')).toEqual([
      'Step one',
      'Step two',
      'Step three',
    ])
  })

  it('does not split on commas, unlike toTagsArray', () => {
    expect(toLines('One, two, three')).toEqual(['One, two, three'])
  })
})
