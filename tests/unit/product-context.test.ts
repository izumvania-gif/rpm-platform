import { describe, expect, it } from 'vitest'
import { isActiveProduct, resolveActiveProductId } from '@/lib/product-context'

describe('resolveActiveProductId', () => {
  const owned = ['a-id', 'b-id', 'c-id']

  it('honours a cookie pointing at a product the user owns', () => {
    expect(resolveActiveProductId('b-id', owned)).toBe('b-id')
  })

  it('falls back to the first product when there is no cookie', () => {
    expect(resolveActiveProductId(undefined, owned)).toBe('a-id')
    expect(resolveActiveProductId('', owned)).toBe('a-id')
  })

  // Cookie приходит от клиента и её можно поставить руками. Без этой проверки
  // чужой или уже удалённый id молча стал бы «активным продуктом», и все
  // списки отфильтровались бы в пустоту без единого объяснения.
  it('ignores a cookie naming a product the user does not own', () => {
    expect(resolveActiveProductId('somebody-elses-id', owned)).toBe('a-id')
  })

  it('ignores a cookie naming a product that no longer exists', () => {
    expect(resolveActiveProductId('deleted-id', owned)).toBe('a-id')
  })

  it('returns null when the user has no products at all', () => {
    expect(resolveActiveProductId(undefined, [])).toBeNull()
    expect(resolveActiveProductId('anything', [])).toBeNull()
  })
})

describe('isActiveProduct', () => {
  it('is true only for the active one', () => {
    expect(isActiveProduct('a-id', 'a-id')).toBe(true)
    expect(isActiveProduct('a-id', 'b-id')).toBe(false)
  })

  it('is false when nothing is active', () => {
    expect(isActiveProduct(null, 'a-id')).toBe(false)
  })
})
