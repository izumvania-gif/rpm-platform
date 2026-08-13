import { describe, expect, it } from 'vitest'
import { suggestInsightsFromTranscript } from '@/lib/suggestions'

describe('suggestInsightsFromTranscript', () => {
  it('offers quoted fragments as the strongest candidates', () => {
    const result = suggestInsightsFromTranscript(
      'Обсудили сроки. «Мы не можем ждать неделю выпуска сертификата» — сказал клиент.'
    )
    expect(result[0].text).toBe('Мы не можем ждать неделю выпуска сертификата')
    expect(result[0].reason).toBe('прямая речь в кавычках')
  })

  it('reads straight double quotes too', () => {
    const result = suggestInsightsFromTranscript('Он сказал: "Решение принимает ИБ, а не ИТ"')
    expect(result.map((r) => r.text)).toContain('Решение принимает ИБ, а не ИТ')
  })

  it('picks up dash-marked dialogue lines', () => {
    const result = suggestInsightsFromTranscript(
      ['— Сколько сейчас занимает выпуск сертификата?', '— Примерно неделю, иногда дольше.'].join(
        '\n'
      )
    )
    expect(result).toHaveLength(2)
    expect(result[0].reason).toBe('реплика в диалоге')
  })

  it('picks up speaker-labelled lines and names the speaker', () => {
    const result = suggestInsightsFromTranscript('Клиент: нам важно закрыть это до конца квартала')
    expect(result[0].text).toBe('нам важно закрыть это до конца квартала')
    expect(result[0].reason).toBe('реплика: Клиент')
  })

  it('stays silent on prose with no quotes and no speakers', () => {
    // Every sentence would qualify, and twenty suggestions is worse than none:
    // it hands the reading work back while pretending to have done it.
    expect(
      suggestInsightsFromTranscript(
        'Встреча прошла хорошо. Обсудили сроки и бюджет. Договорились вернуться позже.'
      )
    ).toEqual([])
  })

  it('drops fragments too short to be an insight', () => {
    expect(suggestInsightsFromTranscript(['— Да.', '— Нет, спасибо.'].join('\n'))).toEqual([])
  })

  it('does not re-offer something already saved as an insight', () => {
    const transcript = '«Мы не можем ждать неделю выпуска сертификата»'
    expect(
      suggestInsightsFromTranscript(transcript, ['Мы не можем ждать неделю выпуска сертификата'])
    ).toEqual([])
  })

  it('ignores case and spacing when matching an existing insight', () => {
    const transcript = '«Решение принимает служба безопасности»'
    expect(
      suggestInsightsFromTranscript(transcript, ['решение   принимает  СЛУЖБА безопасности'])
    ).toEqual([])
  })

  it('does not offer the same fragment twice', () => {
    const transcript = '«Мы не можем ждать неделю» ... позже снова «Мы не можем ждать неделю»'
    expect(suggestInsightsFromTranscript(transcript)).toHaveLength(1)
  })

  it('collapses whitespace inside a fragment', () => {
    const result = suggestInsightsFromTranscript('«Мы   не можем\n  ждать целую неделю»')
    expect(result[0].text).toBe('Мы не можем ждать целую неделю')
  })

  it('caps the list so the panel stays scannable', () => {
    const lines = Array.from({ length: 20 }, (_, i) => `— Реплика номер ${i} достаточно длинная`)
    expect(suggestInsightsFromTranscript(lines.join('\n'))).toHaveLength(8)
  })

  it('returns nothing for an empty or missing transcript', () => {
    expect(suggestInsightsFromTranscript(null)).toEqual([])
    expect(suggestInsightsFromTranscript(undefined)).toEqual([])
    expect(suggestInsightsFromTranscript('   \n  ')).toEqual([])
  })

  it('does not mistake an ordinary colon for a speaker label', () => {
    // "Итого:" style prose should not become a suggestion attributed to a
    // speaker — the label has to look like a name, not a sentence.
    const result = suggestInsightsFromTranscript(
      'В целом всё прошло по плану и мы обсудили довольно много важных деталей: сроки и бюджет'
    )
    expect(result).toEqual([])
  })
})
