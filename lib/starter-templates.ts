// Industry starter templates (plans/2.0-product-leap-plan.md, A4).
//
// The cheapest way to turn authoring into editing: give the PM a plausible
// skeleton to prune and rename instead of a blank product. No AI — just
// curated content, which for a first pass is both more predictable and
// instantly available.
//
// Each template stays deliberately small (5-8 segments, 6-10 JTBD, a few
// hypotheses). A template that fills everything would be worse than none:
// the PM has to read and judge every row, and a hundred rows of plausible
// filler is harder to clean up than ten to extend.

import { JtbdJobType } from '@prisma/client'

export interface TemplateJtbd {
  title: string
  category: string
  jobType: JtbdJobType
  /** Index into the template's `segments`, so JTBD arrive already linked. */
  segmentIndexes: number[]
}

export interface StarterTemplate {
  key: string
  name: string
  description: string
  segments: { name: string; description?: string }[]
  jtbds: TemplateJtbd[]
  hypotheses: string[]
}

export const starterTemplates: StarterTemplate[] = [
  {
    key: 'b2b-security',
    name: 'Аппаратная и криптографическая безопасность',
    description: 'Продажи через интеграторов, регуляторные требования, длинный цикл сделки.',
    segments: [
      { name: 'Банки топ-30', description: 'Собственная ИБ-служба, жёсткие требования регулятора' },
      { name: 'Госзаказчики', description: 'Закупки по 44-ФЗ/223-ФЗ, обязательная сертификация' },
      {
        name: 'СМБ-интеграторы',
        description: 'Перепродают и внедряют, важна простота развёртывания',
      },
      { name: 'Крупные промышленные холдинги', description: 'Распределённая инфраструктура' },
      { name: 'Удостоверяющие центры' },
    ],
    jtbds: [
      {
        title: 'Выпустить сертификат сотруднику, не заставляя его ехать в офис',
        category: 'Выпуск и обслуживание',
        jobType: JtbdJobType.CORE_JOB,
        segmentIndexes: [0, 1, 3],
      },
      {
        title: 'Отозвать доступ уволенного сотрудника в тот же день',
        category: 'Выпуск и обслуживание',
        jobType: JtbdJobType.CORE_JOB,
        segmentIndexes: [0, 3],
      },
      {
        title: 'Подтвердить регулятору, что средство защиты сертифицировано',
        category: 'Соответствие требованиям',
        jobType: JtbdJobType.BIG_JOB,
        segmentIndexes: [0, 1],
      },
      {
        title: 'Развернуть решение у заказчика за разумный срок',
        category: 'Внедрение',
        jobType: JtbdJobType.CORE_JOB,
        segmentIndexes: [2, 4],
      },
      {
        title: 'Понять, сколько токенов реально используется',
        category: 'Эксплуатация',
        jobType: JtbdJobType.SMALL_JOB,
        segmentIndexes: [0, 3],
      },
      {
        title: 'Восстановить доступ, когда сотрудник забыл PIN',
        category: 'Эксплуатация',
        jobType: JtbdJobType.SMALL_JOB,
        segmentIndexes: [0, 2, 3],
      },
    ],
    hypotheses: [
      'Если выдавать сертификат без визита в офис, банки сократят онбординг сотрудника вдвое',
      'Госзаказчики не рассматривают решение без действующего сертификата ФСТЭК',
      'Интеграторы выбирают продукт по скорости развёртывания, а не по цене лицензии',
      'Массовый отзыв доступов — причина, по которой холдинги переходят с ручных процессов',
    ],
  },
  {
    key: 'b2b-saas',
    name: 'B2B SaaS',
    description: 'Самостоятельный онбординг, подписка, расширение внутри аккаунта.',
    segments: [
      { name: 'Малый бизнес до 50 человек', description: 'Покупают сами, без тендера' },
      { name: 'Средний бизнес', description: 'Есть ИТ-служба, нужна интеграция с текущим стеком' },
      { name: 'Энтерпрайз', description: 'Закупка через тендер, требования по безопасности' },
      { name: 'Агентства и подрядчики', description: 'Работают сразу с несколькими клиентами' },
    ],
    jtbds: [
      {
        title: 'Понять ценность продукта до оплаты',
        category: 'Онбординг',
        jobType: JtbdJobType.BIG_JOB,
        segmentIndexes: [0, 1],
      },
      {
        title: 'Подключить команду, не объясняя каждому по отдельности',
        category: 'Онбординг',
        jobType: JtbdJobType.CORE_JOB,
        segmentIndexes: [1, 2],
      },
      {
        title: 'Связать продукт с инструментами, которыми команда уже пользуется',
        category: 'Интеграции',
        jobType: JtbdJobType.CORE_JOB,
        segmentIndexes: [1, 2],
      },
      {
        title: 'Отчитаться руководству, что подписка окупается',
        category: 'Ценность',
        jobType: JtbdJobType.BIG_JOB,
        segmentIndexes: [1, 2],
      },
      {
        title: 'Разделить данные разных клиентов',
        category: 'Работа с клиентами',
        jobType: JtbdJobType.CORE_JOB,
        segmentIndexes: [3],
      },
      {
        title: 'Понять, кто в команде не пользуется продуктом',
        category: 'Ценность',
        jobType: JtbdJobType.SMALL_JOB,
        segmentIndexes: [1, 2],
      },
    ],
    hypotheses: [
      'Если показать ценность в первые 10 минут, конверсия из триала вырастет',
      'Отсутствие интеграции с текущим стеком — главная причина отказа среднего бизнеса',
      'Энтерпрайз не купит без SSO и журнала аудита',
    ],
  },
  {
    key: 'devtool',
    name: 'Инструмент для разработчиков',
    description: 'Внедрение снизу вверх, документация как канал продаж.',
    segments: [
      { name: 'Индивидуальные разработчики', description: 'Пробуют сами, приносят в команду' },
      { name: 'Продуктовые команды', description: 'Решают вместе, важна скорость внедрения' },
      { name: 'Платформенные команды', description: 'Отвечают за инфраструктуру всей компании' },
      { name: 'Опенсорс-проекты' },
    ],
    jtbds: [
      {
        title: 'Запустить первый рабочий пример за пять минут',
        category: 'Первое знакомство',
        jobType: JtbdJobType.BIG_JOB,
        segmentIndexes: [0, 1],
      },
      {
        title: 'Понять, во что обойдётся отказ от текущего решения',
        category: 'Миграция',
        jobType: JtbdJobType.BIG_JOB,
        segmentIndexes: [1, 2],
      },
      {
        title: 'Встроить инструмент в CI без ручных шагов',
        category: 'Автоматизация',
        jobType: JtbdJobType.CORE_JOB,
        segmentIndexes: [1, 2],
      },
      {
        title: 'Найти причину падения, не читая весь лог',
        category: 'Отладка',
        jobType: JtbdJobType.CORE_JOB,
        segmentIndexes: [0, 1],
      },
      {
        title: 'Убедить команду, что инструмент стоит внедрять',
        category: 'Распространение',
        jobType: JtbdJobType.BIG_JOB,
        segmentIndexes: [0],
      },
    ],
    hypotheses: [
      'Если первый пример работает за пять минут, разработчик принесёт инструмент в команду',
      'Платформенные команды выбирают по стоимости сопровождения, а не по набору фич',
      'Отсутствие внятной истории миграции блокирует переход с текущего решения',
    ],
  },
]

export function templateByKey(key: string): StarterTemplate | undefined {
  return starterTemplates.find((t) => t.key === key)
}

/**
 * Serializable summary for the client panel. The full template imports
 * JtbdJobType from @prisma/client, which must not cross the client boundary —
 * the page (a Server Component) passes these plain rows down instead.
 */
export interface TemplateSummary {
  key: string
  name: string
  description: string
  segmentCount: number
  jtbdCount: number
  hypothesisCount: number
}

export function templateSummaries(): TemplateSummary[] {
  return starterTemplates.map((t) => ({
    key: t.key,
    name: t.name,
    description: t.description,
    segmentCount: t.segments.length,
    jtbdCount: t.jtbds.length,
    hypothesisCount: t.hypotheses.length,
  }))
}
