import { describe, expect, it } from 'vitest'
import {
  BASE_MODULE_HREFS,
  deriveNavStage,
  isBaseModule,
  resolveNavStage,
  shouldOfferStageToggle,
  visibleHrefs,
} from '@/lib/nav-disclosure'

describe('the base contour', () => {
  it('is exactly the chain the method starts with', () => {
    expect([...BASE_MODULE_HREFS]).toEqual(['/products', '/segments', '/jtbd'])
  })

  it('recognises base modules and nothing else', () => {
    expect(isBaseModule('/products')).toBe(true)
    expect(isBaseModule('/jtbd')).toBe(true)
    expect(isBaseModule('/marketing')).toBe(false)
    expect(isBaseModule('/hypotheses')).toBe(false)
  })

  it('does not treat a sub-route of a base module as base', () => {
    // /jtbd/graph is its own nav entry; with no JTBD yet the graph is empty,
    // so it belongs to the expanded set rather than the starting contour.
    expect(isBaseModule('/jtbd/graph')).toBe(false)
  })
})

describe('deriveNavStage', () => {
  it('stays basic only while nothing exists outside the base chain', () => {
    expect(deriveNavStage(false)).toBe('basic')
  })

  it('expands as soon as there is data anywhere beyond it', () => {
    // The invariant that makes the whole feature safe: basic mode can only
    // ever hide modules that are empty.
    expect(deriveNavStage(true)).toBe('full')
  })
})

describe('resolveNavStage', () => {
  it('follows the data when no explicit choice was made', () => {
    expect(resolveNavStage('basic', null)).toBe('basic')
    expect(resolveNavStage('full', null)).toBe('full')
  })

  it('lets an explicit choice win in both directions', () => {
    expect(resolveNavStage('basic', 'full')).toBe('full')
    expect(resolveNavStage('full', 'basic')).toBe('basic')
  })
})

describe('shouldOfferStageToggle', () => {
  it('offers the control while the nav is collapsed', () => {
    expect(shouldOfferStageToggle('basic', null)).toBe(true)
  })

  it('offers it whenever an override could be undone', () => {
    expect(shouldOfferStageToggle('basic', 'full')).toBe(true)
    expect(shouldOfferStageToggle('full', 'basic')).toBe(true)
  })

  it('stays out of the way in a mature workspace with no override', () => {
    // Header space is scarce — a control that can only say "everything is
    // already shown" is clutter.
    expect(shouldOfferStageToggle('full', null)).toBe(false)
  })
})

describe('visibleHrefs', () => {
  const items = [
    { href: '/products' },
    { href: '/segments' },
    { href: '/jtbd' },
    { href: '/marketing' },
    { href: '/hypotheses' },
  ]

  it('passes everything through at full stage', () => {
    expect(visibleHrefs(items, 'full')).toHaveLength(5)
  })

  it('keeps only the base contour at basic stage', () => {
    expect(visibleHrefs(items, 'basic').map((i) => i.href)).toEqual([
      '/products',
      '/segments',
      '/jtbd',
    ])
  })

  it('returns an empty list when nothing in the group is base', () => {
    // Every nav sub-link is outside the base contour, so a collapsed nav must
    // drop the dropdown entirely rather than render an empty panel.
    expect(visibleHrefs([{ href: '/features' }, { href: '/people' }], 'basic')).toEqual([])
  })

  it('does not mutate the input', () => {
    const original = [...items]
    visibleHrefs(items, 'basic')
    expect(items).toEqual(original)
  })
})
