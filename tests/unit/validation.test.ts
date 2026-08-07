import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { optionalDate, optionalNumber, optionalString, toTagsArray } from '@/lib/validation'

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
