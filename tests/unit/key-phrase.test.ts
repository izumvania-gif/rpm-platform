import { describe, expect, it } from 'vitest'
import { hypothesisKeyPhrase, insightKeyPhrase, jtbdKeyPhrase } from '@/lib/key-phrase'

// Leading the row with the point instead of the boilerplate.
//
// The one thing these functions must never do is change what a record says.
// They select a span of the existing text; a test that only checked "it got
// shorter" would not catch the failure that matters, so the cases below use
// the real seeded wording and assert the exact result.

describe('jtbdKeyPhrase', () => {
  it('leads with the job instead of the situation', () => {
    expect(
      jtbdKeyPhrase(
        'Когда сертификаты «размазаны» по командам, Excel-таблицам и личным почтам, ' +
          'я хочу единый инвентарь всех сертификатов в реальном времени с автообнаружением новых, ' +
          'чтобы видеть полную картину инфраструктуры и не терять «теневые» активы.'
      )
    ).toBe('Единый инвентарь всех сертификатов в реальном времени с автообнаружением новых')
  })

  it('survives a comma-heavy situation clause', () => {
    // The situation here contains its own commas and a parenthetical — the
    // split has to key off «я хочу», not off the first comma.
    expect(
      jtbdKeyPhrase(
        'Когда с 1 марта 2026 действует Приказ №117 ФСТЭК с обязательной аутентификацией ' +
          'устройств при каждом запросе на подключение (мера ИАФ.4), я хочу централизованную ' +
          'систему на протоколах CMP/EST/ACME/WSTEP со сменой сертификатов не реже раза в год, ' +
          'чтобы соответствовать требованиям регулятора.'
      )
    ).toBe(
      'Централизованную систему на протоколах CMP/EST/ACME/WSTEP со сменой сертификатов не реже раза в год'
    )
  })

  it('leaves a plainly worded job untouched', () => {
    // Templates are a convention, not a requirement — anything that does not
    // follow one must come through unchanged rather than mangled.
    const plain = 'Выпустить сертификат сотруднику, не заставляя его ехать в офис'
    expect(jtbdKeyPhrase(plain)).toBe(plain)
  })

  it('handles a job with no purpose clause', () => {
    expect(jtbdKeyPhrase('Когда токен потерян, я хочу отозвать доступ в тот же день')).toBe(
      'Отозвать доступ в тот же день'
    )
  })
})

describe('hypothesisKeyPhrase', () => {
  it('keeps the intervention and drops the prediction', () => {
    expect(
      hypothesisKeyPhrase(
        'Если поддержать аппаратные модули безопасности и токены Рутокен для хранения ключей ' +
          'в защищённом hardware-контуре, то зрелые финтех/банковские клиенты с высокими ' +
          'требованиями ИБ выберут нас вместо самописного решения.'
      )
    ).toBe(
      'Поддержать аппаратные модули безопасности и токены Рутокен для хранения ключей в защищённом hardware-контуре'
    )
  })

  it('keeps everything when there is no «то» clause', () => {
    expect(
      hypothesisKeyPhrase(
        'Если выдавать сертификат без визита в офис, банки сократят онбординг сотрудника вдвое'
      )
    ).toBe('Выдавать сертификат без визита в офис, банки сократят онбординг сотрудника вдвое')
  })

  it('leaves a statement that does not start with «Если» alone', () => {
    const plain = 'Клиенты не готовы ждать неделю выпуска сертификата'
    expect(hypothesisKeyPhrase(plain)).toBe(plain)
  })
})

describe('insightKeyPhrase', () => {
  it('drops a habitual label', () => {
    expect(
      insightKeyPhrase(
        'Вывод: высокая готовность обсуждать пилот — есть выделенный бюджет на ИБ-инициативы.'
      )
    ).toBe('Высокая готовность обсуждать пилот — есть выделенный бюджет на ИБ-инициативы.')
  })

  it('keeps the quotation marks that mark a customer’s own words', () => {
    // The «…» is the signal that this is a verbatim quote rather than
    // somebody's conclusion — stripping it would erase that distinction.
    const quote = '«Мы не можем ждать неделю выпуска сертификата — люди простаивают»'
    expect(insightKeyPhrase(quote)).toBe(quote)
  })

  it('leaves an unlabelled conclusion alone', () => {
    const plain = 'Решение о закупке принимает служба информационной безопасности'
    expect(insightKeyPhrase(plain)).toBe(plain)
  })
})
