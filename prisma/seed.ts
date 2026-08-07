import {
  PrismaClient,
  Stage,
  ResearchType,
  ResearchStatus,
  HypothesisStatus,
  ProductResourceKind,
  JtbdJobType,
} from '@prisma/client'
import bcrypt from 'bcryptjs'
import { DEFAULT_USER_ID } from '../lib/current-user'

const prisma = new PrismaClient()

const now = Date.now()
function daysAgo(n: number): Date {
  return new Date(now - n * 24 * 60 * 60 * 1000)
}

const DEMO_PRODUCT_SLUG = 'rutoken-clm'

/**
 * Пример продукта "Рутокен CLM", построенный на реальном сейл-ките, чтобы
 * платформа поставлялась с одним полностью заполненным продуктом и
 * демонстрировала все модули и фичи (теги, закрепление, статусы,
 * "давно не обновлялось" и т.д.) на реалистичных данных.
 */
async function seedDemoProduct(userId: string) {
  const existing = await prisma.product.findUnique({ where: { slug: DEMO_PRODUCT_SLUG } })
  if (existing) {
    console.log('Демо-продукт «Рутокен CLM» уже существует, пропускаем.')
    return
  }

  const product = await prisma.product.create({
    data: {
      name: 'Рутокен CLM',
      slug: DEMO_PRODUCT_SLUG,
      stage: Stage.MVP,
      description:
        'Система централизованного управления жизненным циклом цифровых сертификатов ' +
        '(Certificate Lifecycle Management) для крупного энтерпрайза: инвентаризация, ' +
        'мониторинг сроков действия и автоматизация ротации TLS/mTLS-сертификатов. ' +
        'Отвечает на взрывной рост числа сертификатов в микросервисных и Zero Trust-архитектурах, ' +
        'сокращение их срока жизни по стандарту CA/Browser Forum и требования Приказа №117 ФСТЭК ' +
        'России (мера защиты ИАФ.4). Коммерческая версия ожидается в конце 2026 — начале 2027 года.',
      userId,
      createdAt: daysAgo(150),
      updatedAt: daysAgo(2),
    },
  })

  const segments = {
    it: await prisma.segment.create({
      data: {
        name: 'Внутри компании: ИТ-инфраструктура',
        slug: 'it-infrastruktura',
        color: '#3B82F6',
        description:
          'Функциональный заказчик и ЛПР. Типовые должности: руководитель ИТ-отдела, ' +
          'DevOps-инженер, системный администратор. Боль — распределённые сертификаты без ' +
          'единой точки учёта, ручной контроль сроков, неэффективная ротация, поддержание SLA.',
        tags: ['лпр', 'внутри-компании'],
        pinned: true,
        productId: product.id,
        userId,
        createdAt: daysAgo(148),
      },
    }),
    isec: await prisma.segment.create({
      data: {
        name: 'Внутри компании: Информационная безопасность',
        slug: 'informacionnaya-bezopasnost',
        color: '#8B5CF6',
        description:
          'Может влиять на выбор решения или выступать как функциональный заказчик (ЛВР). ' +
          'Типовые должности: руководитель отдела ИБ, ИБ-аналитик. Боль — риски при ' +
          'компрометации сертификатов, требования регуляторов к сессионным/короткоживущим сертификатам.',
        tags: ['лвр', 'внутри-компании', 'ib'],
        productId: product.id,
        userId,
        createdAt: daysAgo(148),
      },
    }),
    banks: await prisma.segment.create({
      data: {
        name: 'Банки топ-30',
        slug: 'banki-top-30',
        color: '#059669',
        audienceShare: 15,
        description:
          'Зрелый сегмент. Финтех-организации с развитой ИТ/ИБ-инфраструктурой, часто ' +
          'относятся к КИИ, обязаны соответствовать Приказу №117 ФСТЭК.',
        tags: ['финтех', 'зрелые', 'кии'],
        pinned: true,
        productId: product.id,
        userId,
        createdAt: daysAgo(140),
      },
    }),
    insurance: await prisma.segment.create({
      data: {
        name: 'Страховые компании и платёжная инфраструктура',
        slug: 'strahovye-i-platezhnaya-infrastruktura',
        color: '#10B981',
        audienceShare: 8,
        description:
          'Зрелый сегмент, включает страховые компании и платёжную инфраструктуру (НСПК).',
        tags: ['финтех', 'зрелые'],
        productId: product.id,
        userId,
        createdAt: daysAgo(140),
      },
    }),
    retail: await prisma.segment.create({
      data: {
        name: 'Ритейл и маркетплейсы',
        slug: 'riteyl-i-marketpleysy',
        color: '#F59E0B',
        audienceShare: 12,
        description:
          'Зрелый сегмент: офлайн-ритейлеры (Магнит, X5, Вкусвилл, Спортмастер) и маркетплейсы ' +
          '(Ozon, Wildberries, Flowwow, Золотое яблоко). Высоконагруженные клиентские web/мобильные сервисы.',
        tags: ['ритейл', 'зрелые'],
        productId: product.id,
        userId,
        createdAt: daysAgo(135),
      },
    }),
    dev: await prisma.segment.create({
      data: {
        name: 'Крупная заказная разработка',
        slug: 'krupnaya-zakaznaya-razrabotka',
        color: '#0EA5E9',
        audienceShare: 5,
        description: 'Зрелый сегмент: компании крупной заказной разработки (пример — Рубитех).',
        tags: ['разработка', 'зрелые'],
        productId: product.id,
        userId,
        createdAt: daysAgo(135),
      },
    }),
    gov: await prisma.segment.create({
      data: {
        name: 'Госсектор и эксплуатанты СМЭВ',
        slug: 'gossektor-i-smev',
        color: '#6366F1',
        audienceShare: 20,
        description:
          'Полузрелый сегмент: государственные организации и эксплуатанты СМЭВ. Потребность ' +
          'есть по гипотезе команды, но не до конца осознана.',
        tags: ['госсектор', 'полузрелые'],
        productId: product.id,
        userId,
        createdAt: daysAgo(120),
      },
    }),
    industry: await prisma.segment.create({
      data: {
        name: 'Промышленность и телеком',
        slug: 'promyshlennost-i-telekom',
        color: '#DC2626',
        audienceShare: 25,
        description:
          'Полузрелый сегмент: промышленные холдинги (Северсталь, НЛМК), телеком-операторы, ' +
          'страховые. Нужно доказать актуальность и критичность потребности.',
        tags: ['промышленность', 'телеком', 'полузрелые'],
        productId: product.id,
        userId,
        createdAt: daysAgo(120),
      },
    }),
    cloud: await prisma.segment.create({
      data: {
        name: 'Облачные провайдеры',
        slug: 'oblachnye-provaydery',
        color: '#94A3B8',
        audienceShare: 3,
        description:
          'Незрелый сегмент: компании из целевых секторов, с которыми ещё не было детального ' +
          'общения. Задача — найти релевантный контакт и провести встречу для проверки интереса.',
        tags: ['облако', 'незрелые'],
        productId: product.id,
        userId,
        createdAt: daysAgo(90),
      },
    }),
  }

  const researches = {
    market: await prisma.research.create({
      data: {
        title: 'Рыночная аналитика: рост числа сертификатов и требования регулятора',
        type: ResearchType.DESK_RESEARCH,
        status: ResearchStatus.COMPLETED,
        description:
          'Кабинетное исследование актуальности проблематики CLM: рост числа сертификатов при ' +
          'переходе на микросервисы/Zero Trust (малый бизнес 5–30, средний 100–1000, крупный ' +
          '5000–50000, крупнейшие свыше 100000 сертификатов), последовательное сокращение срока ' +
          'жизни TLS-сертификатов по стандарту CA/Browser Forum (2016 — 1095 дней → 2029 — 47 дней), ' +
          'данные DigiCert (2025) о простоях 2–50 часов при просрочке сертификата у крупных компаний, ' +
          'резонансные инциденты (Starlink 2023, Microsoft Azure 2023, Cloudflare 2024, GitHub 2023), ' +
          'а также требования Приказа №117 ФСТЭК (вступил в силу 1 марта 2026, методический документ ' +
          'от 12 апреля 2026, мера защиты ИАФ.4).',
        tags: ['рынок', 'регулятор', 'фстэк', 'desk-research'],
        pinned: true,
        date: daysAgo(130),
        productId: product.id,
        userId,
        createdAt: daysAgo(130),
        updatedAt: daysAgo(20),
      },
    }),
    interviews: await prisma.research.create({
      data: {
        title: 'Квалификационные интервью с ЛПР зрелых клиентов',
        type: ResearchType.QUALITATIVE,
        status: ResearchStatus.COMPLETED,
        description:
          'Серия интервью с руководителями ИТ и ИБ по методике квалификационных вопросов ' +
          'сейл-кита: учёт сертификатов, ручной контроль сроков, инциденты с просрочкой, ' +
          'эффективность ротации, соответствие SLA.',
        tags: ['custdev', 'лпр', 'зрелые'],
        date: daysAgo(60),
        productId: product.id,
        userId,
        createdAt: daysAgo(60),
        updatedAt: daysAgo(15),
      },
    }),
    survey: await prisma.research.create({
      data: {
        title: 'Опросник для оценки инфраструктуры и стоимости лицензирования',
        type: ResearchType.SURVEY,
        status: ResearchStatus.IN_PROGRESS,
        description:
          'Сбор вводных данных о инфраструктуре заказчика (масштаб PKI, число УЦ, используемые ' +
          'протоколы) для расчёта примерной стоимости проекта — модель лицензирования продукта ' +
          'ещё не зафиксирована.',
        tags: ['лицензирование', 'опросник'],
        date: daysAgo(10),
        productId: product.id,
        userId,
        createdAt: daysAgo(10),
      },
    }),
    competitors: await prisma.research.create({
      data: {
        title: 'Технологический и конкурентный бенчмарк',
        type: ResearchType.ANALYTICS,
        status: ResearchStatus.IN_PROGRESS,
        description:
          'Сравнение с самописными решениями заказчиков и встроенными модулями обновления ' +
          'сертификатов в УЦ. Таблица сравнения по разделу «Конкурентное окружение» сейл-кита ' +
          'ещё не заполнена — требуется донабрать данные.',
        tags: ['конкуренты', 'бенчмарк'],
        date: daysAgo(125),
        productId: product.id,
        userId,
        createdAt: daysAgo(125),
        updatedAt: daysAgo(125),
      },
    }),
  }

  const jtbds = {
    inventory: await prisma.jTBD.create({
      data: {
        title:
          'Когда сертификаты «размазаны» по командам, Excel-таблицам и личным почтам, я хочу ' +
          'единый инвентарь всех сертификатов в реальном времени с автообнаружением новых, чтобы ' +
          'видеть полную картину инфраструктуры и не терять «теневые» активы.',
        category: 'Учёт и инвентаризация',
        description: 'Ключевая боль ИТ-ЛПР: нет единой точки учёта сертификатов.',
        jobType: JtbdJobType.SMALL_JOB,
        confirmed: true,
        tags: ['инвентаризация', 'ит'],
        pinned: true,
        productId: product.id,
        segmentId: segments.it.id,
        researchId: researches.interviews.id,
        userId,
        createdAt: daysAgo(58),
        updatedAt: daysAgo(12),
      },
    }),
    monitoring: await prisma.jTBD.create({
      data: {
        title:
          'Когда контроль сроков истечения сертификатов зависит от конкретного сотрудника и ' +
          'делается вручную, я хочу автоматические уведомления и дашборд с истекающими ' +
          'сертификатами, чтобы устранить человеческий фактор (забыл, ушёл в отпуск, сменился).',
        category: 'Контроль сроков',
        jobType: JtbdJobType.SMALL_JOB,
        confirmed: true,
        tags: ['мониторинг', 'уведомления'],
        productId: product.id,
        segmentId: segments.it.id,
        researchId: researches.interviews.id,
        userId,
        createdAt: daysAgo(58),
        updatedAt: daysAgo(12),
      },
    }),
    automation: await prisma.jTBD.create({
      data: {
        title:
          'Когда ручная ротация одного сертификата занимает от нескольких часов до нескольких ' +
          'дней дорогостоящего DevOps-времени, я хочу автоматизировать весь цикл запрос → выпуск ' +
          '→ деплой → замена без участия человека, чтобы снизить риск ошибок и освободить ресурс.',
        category: 'Автоматизация ротации',
        jobType: JtbdJobType.CORE_JOB,
        confirmed: false,
        tags: ['автоматизация', 'devops'],
        productId: product.id,
        segmentId: segments.it.id,
        researchId: researches.interviews.id,
        userId,
        createdAt: daysAgo(55),
      },
    }),
    continuity: await prisma.jTBD.create({
      data: {
        title:
          'Когда просроченный сертификат означает недоступный сервис, штрафы за нарушение SLA и ' +
          'репутационный ущерб, я хочу гарантию, что ни один сертификат не истечёт незамеченным, ' +
          'чтобы обеспечить непрерывность бизнеса перед клиентами.',
        category: 'Непрерывность и SLA',
        jobType: JtbdJobType.BIG_JOB,
        confirmed: true,
        tags: ['sla', 'непрерывность'],
        pinned: true,
        productId: product.id,
        segmentId: segments.banks.id,
        researchId: researches.market.id,
        userId,
        createdAt: daysAgo(45),
        updatedAt: daysAgo(5),
      },
    }),
    compliance: await prisma.jTBD.create({
      data: {
        title:
          'Когда с 1 марта 2026 действует Приказ №117 ФСТЭК с обязательной аутентификацией ' +
          'устройств при каждом запросе на подключение (мера ИАФ.4), я хочу централизованную ' +
          'систему на протоколах CMP/EST/ACME/WSTEP со сменой сертификатов не реже раза в год, ' +
          'чтобы соответствовать требованиям регулятора.',
        category: 'Комплаенс',
        jobType: JtbdJobType.BIG_JOB,
        confirmed: true,
        tags: ['фстэк', 'комплаенс', 'кии'],
        productId: product.id,
        segmentId: segments.gov.id,
        researchId: researches.market.id,
        userId,
        createdAt: daysAgo(40),
        updatedAt: daysAgo(8),
      },
    }),
    infosec: await prisma.jTBD.create({
      data: {
        title:
          'Когда компрометация сертификата создаёт риск для всей инфраструктуры, я хочу ' +
          'выпускать и контролировать сессионные/короткоживущие сертификаты, чтобы снизить ' +
          'поверхность атаки и соответствовать требованиям регуляторов и УЦ.',
        category: 'Информационная безопасность',
        jobType: JtbdJobType.MICRO_JOB,
        confirmed: false,
        tags: ['ib', 'компрометация'],
        productId: product.id,
        segmentId: segments.isec.id,
        researchId: researches.interviews.id,
        userId,
        createdAt: daysAgo(130),
        updatedAt: daysAgo(130),
      },
    }),
  }

  // Иерархия JTBD: "непрерывность" и "комплаенс" — верхнеуровневые задачи,
  // остальные — шаги к их решению.
  await prisma.jTBD.update({
    where: { id: jtbds.inventory.id },
    data: { parentId: jtbds.continuity.id },
  })
  await prisma.jTBD.update({
    where: { id: jtbds.monitoring.id },
    data: { parentId: jtbds.continuity.id },
  })
  await prisma.jTBD.update({
    where: { id: jtbds.automation.id },
    data: { parentId: jtbds.continuity.id },
  })
  await prisma.jTBD.update({
    where: { id: jtbds.infosec.id },
    data: { parentId: jtbds.compliance.id },
  })

  // Последовательность: сначала знаем, что у нас есть, потом следим за
  // сроками, потом автоматизируем замену; комплаенс отдельно подталкивает
  // к автоматизации.
  await prisma.jtbdSequenceEdge.createMany({
    data: [
      { fromJtbdId: jtbds.inventory.id, toJtbdId: jtbds.monitoring.id },
      { fromJtbdId: jtbds.monitoring.id, toJtbdId: jtbds.automation.id },
      { fromJtbdId: jtbds.compliance.id, toJtbdId: jtbds.automation.id },
    ],
  })

  const h2 = await prisma.hypothesis.create({
    data: {
      statement:
        'Если поддержать аппаратные модули безопасности и токены Рутокен для хранения ключей в ' +
        'защищённом hardware-контуре, то зрелые финтех/банковские клиенты с высокими требованиями ' +
        'ИБ выберут нас вместо самописного решения.',
      status: HypothesisStatus.CONFIRMED,
      priority: 1,
      tags: ['hsm', 'дифференциация'],
      pinned: true,
      productId: product.id,
      jtbdId: jtbds.infosec.id,
      segmentId: segments.banks.id,
      researchId: researches.market.id,
      userId,
      createdAt: daysAgo(100),
      updatedAt: daysAgo(6),
    },
  })
  await prisma.hypothesisStatusChange.createMany({
    data: [
      { hypothesisId: h2.id, status: HypothesisStatus.DRAFT, changedAt: daysAgo(100) },
      { hypothesisId: h2.id, status: HypothesisStatus.IN_REVIEW, changedAt: daysAgo(45) },
      { hypothesisId: h2.id, status: HypothesisStatus.CONFIRMED, changedAt: daysAgo(6) },
    ],
  })

  const h4 = await prisma.hypothesis.create({
    data: {
      statement:
        'Если продукт будет закрывать требования Приказа №117 ФСТЭК «из коробки» (протоколы ' +
        'CMP/EST/ACME/WSTEP, смена сертификатов не реже раза в год), то это станет решающим ' +
        'фактором при выборе для организаций КИИ из госсектора.',
      status: HypothesisStatus.CONFIRMED,
      priority: 1,
      tags: ['фстэк', 'кии'],
      productId: product.id,
      jtbdId: jtbds.compliance.id,
      segmentId: segments.gov.id,
      researchId: researches.market.id,
      userId,
      createdAt: daysAgo(38),
      updatedAt: daysAgo(9),
    },
  })
  await prisma.hypothesisStatusChange.createMany({
    data: [
      { hypothesisId: h4.id, status: HypothesisStatus.DRAFT, changedAt: daysAgo(38) },
      { hypothesisId: h4.id, status: HypothesisStatus.CONFIRMED, changedAt: daysAgo(9) },
    ],
  })

  const h1 = await prisma.hypothesis.create({
    data: {
      statement:
        'Если добавить безагентское сканирование сертификатов от публичных УЦ (GlobalSign, ' +
        "Let's Encrypt) по доменным именам, то онбординг для облачных и гибридных сред " +
        'упростится, и незрелый сегмент облачных провайдеров начнёт проявлять интерес.',
      status: HypothesisStatus.IN_REVIEW,
      priority: 2,
      tags: ['сканирование', 'roadmap'],
      productId: product.id,
      jtbdId: jtbds.inventory.id,
      segmentId: segments.cloud.id,
      userId,
      createdAt: daysAgo(25),
      updatedAt: daysAgo(3),
    },
  })
  await prisma.hypothesisStatusChange.createMany({
    data: [
      { hypothesisId: h1.id, status: HypothesisStatus.DRAFT, changedAt: daysAgo(25) },
      { hypothesisId: h1.id, status: HypothesisStatus.IN_REVIEW, changedAt: daysAgo(3) },
    ],
  })

  const h3 = await prisma.hypothesis.create({
    data: {
      statement:
        'Если ограничиться единственным встроенным модулем обновления сертификатов от одного УЦ, ' +
        'то заказчики с несколькими УЦ в разных контурах предпочтут более гибкое ' +
        'мультипротокольное решение (ACME/EST/CMP/SCEP/WSTEP) — узкая интеграция снизит ' +
        'конкурентоспособность.',
      status: HypothesisStatus.DRAFT,
      priority: 3,
      tags: ['архитектура', 'конкуренты'],
      productId: product.id,
      segmentId: segments.industry.id,
      researchId: researches.competitors.id,
      userId,
      createdAt: daysAgo(15),
    },
  })
  await prisma.hypothesisStatusChange.create({
    data: { hypothesisId: h3.id, status: HypothesisStatus.DRAFT, changedAt: daysAgo(15) },
  })

  const h5 = await prisma.hypothesis.create({
    data: {
      statement:
        'Если включить в презентацию ROI-калькулятор (стоимость простоя/инцидента при просрочке ' +
        'сертификата против стоимости внедрения CLM), то это ускорит принятие решения у ' +
        '«полузрелых» клиентов, которые ещё не до конца осознали потребность.',
      status: HypothesisStatus.REJECTED,
      priority: 4,
      tags: ['roi', 'презентация'],
      productId: product.id,
      researchId: researches.survey.id,
      userId,
      createdAt: daysAgo(20),
      updatedAt: daysAgo(4),
    },
  })
  await prisma.hypothesisStatusChange.createMany({
    data: [
      { hypothesisId: h5.id, status: HypothesisStatus.DRAFT, changedAt: daysAgo(20) },
      { hypothesisId: h5.id, status: HypothesisStatus.REJECTED, changedAt: daysAgo(4) },
    ],
  })

  await prisma.conversation.create({
    data: {
      title: 'Интервью: руководитель ИТ-отдела, банк топ-30',
      transcript:
        'Контекст: зрелый сегмент, банк из топ-30, тяжёлая внутренняя инфраструктура, несколько ' +
        'УЦ в разных контурах.\n\n' +
        'Q: Как сейчас ведётся учёт сертификатов? Есть ли единый реестр?\n' +
        'A: Единого реестра нет. Часть сертификатов — в Excel, часть знает только конкретный ' +
        'инженер. Полной картины нет ни у кого.\n\n' +
        'Q: Как отслеживаются сроки истечения?\n' +
        'A: Вручную, по календарным напоминаниям отдельных сотрудников. Была ситуация, когда ' +
        'ответственный ушёл в отпуск и никто не подхватил.\n\n' +
        'Q: Были ли инциденты с просрочкой?\n' +
        'A: Да, минимум один серьёзный — простой критичного сервиса, разбирательство с SLA перед ' +
        'клиентом.\n\n' +
        'Q: Сколько занимает ручная ротация одного сертификата?\n' +
        'A: От нескольких часов до дня, если нужно согласование с ИБ.\n\n' +
        'Вывод: высокая готовность обсуждать пилот, есть выделенный бюджет на ИБ-инициативы в ' +
        'этом квартале.',
      tags: ['custdev', 'ит', 'банки'],
      pinned: true,
      date: daysAgo(58),
      productId: product.id,
      segmentId: segments.banks.id,
      researchId: researches.interviews.id,
      userId,
      createdAt: daysAgo(58),
    },
  })

  await prisma.conversation.create({
    data: {
      title: 'Интервью: ИБ-аналитик, промышленный холдинг',
      transcript:
        'Контекст: полузрелый сегмент, промышленный холдинг, относится к КИИ.\n\n' +
        'Q: Какие риски видите при компрометации сертификата?\n' +
        'A: Прямой доступ к внутренним системам, потенциально — производственным контурам. ' +
        'Реагирование сейчас ручное и медленное.\n\n' +
        'Q: Какие требования по сессионным/короткоживущим сертификатам сейчас предъявляют ' +
        'регуляторы или УЦ?\n' +
        'A: Знаем про Приказ №117, готовимся, но детального плана перехода пока нет — ' +
        'потребность осознана только частично.\n\n' +
        'Вывод: потребность есть, но решение пока не выбрано; нужно вернуться с конкретным ' +
        'планом соответствия ИАФ.4.',
      tags: ['custdev', 'ib', 'промышленность'],
      date: daysAgo(52),
      productId: product.id,
      segmentId: segments.industry.id,
      researchId: researches.interviews.id,
      userId,
      createdAt: daysAgo(52),
    },
  })

  await prisma.conversation.create({
    data: {
      title: 'Ознакомительный звонок: облачный провайдер',
      transcript:
        'Контекст: незрелый сегмент, детального общения раньше не было.\n\n' +
        'Короткий звонок для проверки интереса. Собеседник подтвердил, что сертификаты — не ' +
        'приоритет квартала, но признал рост числа контейнеров и потенциальную проблему в ' +
        'будущем. Просил вернуться через 2-3 месяца.\n\n' +
        'Вывод: интерес не подтверждён, нужен повторный контакт позже.',
      tags: ['custdev', 'облако', 'незрелые'],
      date: daysAgo(95),
      productId: product.id,
      segmentId: segments.cloud.id,
      userId,
      createdAt: daysAgo(95),
      updatedAt: daysAgo(95),
    },
  })

  await prisma.competitor.create({
    data: {
      name: 'Самописное решение',
      positioning:
        'Собственная разработка внутри компании — типовой статус-кво у крупных заказчиков ' +
        'до появления CLM-решения на рынке.',
      features: ['ручная ротация', 'нет единого UI', 'высокая стоимость поддержки'],
      productId: product.id,
      userId,
      createdAt: daysAgo(100),
    },
  })
  await prisma.competitor.create({
    data: {
      name: 'Встроенный модуль обновления сертификатов в УЦ',
      positioning:
        'Ограничен одним удостоверяющим центром, без мультипротокольности — не подходит ' +
        'заказчикам с несколькими УЦ в разных контурах.',
      features: ['работает только с одним УЦ', 'нет инвентаризации', 'нет дашборда'],
      productId: product.id,
      userId,
      createdAt: daysAgo(95),
    },
  })

  await prisma.productResource.create({
    data: {
      title: 'Рутокен CLM — Сейл-кит 1.0',
      kind: ProductResourceKind.SALES_KIT,
      description:
        'Презентация с внутреннего тренинга по продукту: портрет заказчика, квалификационные ' +
        'вопросы, архитектура, конкурентное окружение.',
      productId: product.id,
      userId,
      createdAt: daysAgo(150),
    },
  })
  await prisma.productResource.create({
    data: {
      title: 'Техническая архитектура',
      kind: ProductResourceKind.DEVELOPER_DOC,
      description:
        'Backend на C++, frontend на TypeScript/React. Протоколы для УЦ: ACME, MS-WSTEP, ' +
        'DCOM, SCEP. gRPC для агентов, REST API для фронта.',
      productId: product.id,
      userId,
      createdAt: daysAgo(150),
    },
  })

  const featureInventory = await prisma.feature.create({
    data: {
      name: 'Единый инвентарь сертификатов',
      description:
        'Агентская схема сканирования с гибкой периодичностью проверок и автоматическим ' +
        'добавлением новых сертификатов в реестр.',
      productId: product.id,
      userId,
      jtbds: { connect: [{ id: jtbds.inventory.id }] },
      createdAt: daysAgo(90),
    },
  })
  const featureDashboard = await prisma.feature.create({
    data: {
      name: 'Дашборд контроля сроков и уведомления',
      description:
        'Цветовая индикация сроков истечения, график динамики, уведомления по email/SMS/SIEM.',
      productId: product.id,
      userId,
      jtbds: { connect: [{ id: jtbds.monitoring.id }] },
      createdAt: daysAgo(88),
    },
  })
  const featureAutomation = await prisma.feature.create({
    data: {
      name: 'Автоматическая ротация сертификатов',
      description:
        'Гибкий график обновления с учётом maintenance-окон, выпуск новых ключей прямо на ' +
        'хосте, автоматический перезапуск сервисов после замены.',
      productId: product.id,
      userId,
      jtbds: { connect: [{ id: jtbds.automation.id }, { id: jtbds.continuity.id }] },
      createdAt: daysAgo(85),
    },
  })
  const featureProtocols = await prisma.feature.create({
    data: {
      name: 'Поддержка протоколов CMP/EST/ACME/WSTEP',
      description: 'Работа с разными УЦ через стандартные протоколы управления сертификатами.',
      productId: product.id,
      userId,
      jtbds: { connect: [{ id: jtbds.compliance.id }] },
      createdAt: daysAgo(80),
    },
  })

  await prisma.rTB.create({
    data: {
      statement:
        'Ни один сертификат не останется незамеченным — единый реестр с автообнаружением ' +
        'и дашбордом сроков в реальном времени.',
      productId: product.id,
      userId,
      features: { connect: [{ id: featureInventory.id }, { id: featureDashboard.id }] },
      createdAt: daysAgo(70),
    },
  })
  await prisma.rTB.create({
    data: {
      statement: 'Ротация без участия человека — от запроса до замены и перезапуска сервиса.',
      productId: product.id,
      userId,
      features: { connect: [{ id: featureAutomation.id }] },
      createdAt: daysAgo(65),
    },
  })
  await prisma.rTB.create({
    data: {
      statement: 'Соответствует требованиям Приказа №117 ФСТЭК «из коробки».',
      productId: product.id,
      userId,
      features: { connect: [{ id: featureProtocols.id }] },
      createdAt: daysAgo(60),
    },
  })

  await prisma.insight.create({
    data: {
      text:
        '«Единого реестра нет. Часть сертификатов — в Excel, часть знает только конкретный ' +
        'инженер. Полной картины нет ни у кого.»',
      tags: ['цитата', 'учёт'],
      pinned: true,
      productId: product.id,
      segmentId: segments.banks.id,
      jtbdId: jtbds.inventory.id,
      researchId: researches.interviews.id,
      userId,
      createdAt: daysAgo(58),
    },
  })
  await prisma.insight.create({
    data: {
      text:
        'Вывод: высокая готовность обсуждать пилот — есть выделенный бюджет на ИБ-инициативы ' +
        'в этом квартале у банков топ-30.',
      tags: ['вывод', 'бюджет'],
      productId: product.id,
      segmentId: segments.banks.id,
      researchId: researches.interviews.id,
      userId,
      createdAt: daysAgo(58),
    },
  })
  await prisma.insight.create({
    data: {
      text:
        'Вывод: потребность в контроле сессионных сертификатов у промышленного холдинга есть, ' +
        'но осознана только частично — решение пока не выбрано.',
      tags: ['вывод', 'ib'],
      productId: product.id,
      segmentId: segments.industry.id,
      jtbdId: jtbds.infosec.id,
      researchId: researches.interviews.id,
      userId,
      createdAt: daysAgo(52),
    },
  })

  console.log('Демо-продукт «Рутокен CLM» создан.')
}

async function main() {
  const passwordHash = await bcrypt.hash('changeme', 10)

  const user = await prisma.user.upsert({
    where: { id: DEFAULT_USER_ID },
    update: {},
    create: {
      id: DEFAULT_USER_ID,
      email: 'owner@echo.local',
      name: 'Owner',
      passwordHash,
    },
  })

  await seedDemoProduct(user.id)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
