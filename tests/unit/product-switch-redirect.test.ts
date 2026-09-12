import { describe, expect, it } from 'vitest'
import { redirectAfterProductSwitch } from '@/lib/product-switch-redirect'

const NEW = 'prod-new'

describe('redirectAfterProductSwitch', () => {
  it('с карточки записи уводит в список раздела', () => {
    expect(redirectAfterProductSwitch('/jtbd/abc123', NEW)).toBe('/jtbd')
    expect(redirectAfterProductSwitch('/segments/xyz', NEW)).toBe('/segments')
    expect(redirectAfterProductSwitch('/hypotheses/h1', NEW)).toBe('/hypotheses')
    expect(redirectAfterProductSwitch('/insights/i1', NEW)).toBe('/insights')
  })

  it('с карточки продукта ведёт на карточку нового продукта', () => {
    expect(redirectAfterProductSwitch('/products/old', NEW)).toBe(`/products/${NEW}`)
    expect(redirectAfterProductSwitch('/products/old/canvas', NEW)).toBe(`/products/${NEW}`)
  })

  it('списки, отчёты и витрины оставляет на месте', () => {
    for (const path of [
      '/',
      '/jtbd',
      '/segments',
      '/reports/gaps',
      '/reports/segments-jtbd',
      '/cpo',
      '/sales-hub',
      '/marketing-hub',
      '/pm/roadmap',
      '/pm/gantt',
      '/search',
    ]) {
      expect(redirectAfterProductSwitch(path, NEW)).toBe(path)
    }
  })

  it('не принимает служебные сегменты за id записи', () => {
    expect(redirectAfterProductSwitch('/jtbd/new', NEW)).toBe('/jtbd/new')
    expect(redirectAfterProductSwitch('/jtbd/graph', NEW)).toBe('/jtbd/graph')
    expect(redirectAfterProductSwitch('/segments/new', NEW)).toBe('/segments/new')
  })

  it('игнорирует строку запроса при разборе пути', () => {
    expect(redirectAfterProductSwitch('/jtbd/abc?tab=links', NEW)).toBe('/jtbd')
  })
})
