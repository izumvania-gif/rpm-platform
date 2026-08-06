# MVP Roadmap - Визуальное представление

Визуальная дорожная карта разработки MVP платформы ECHO.

> **Обновлено 6 августа 2026:** диаграммы ниже — исходный план. Три из них (архитектура, ER-диаграмма, включено/отложено) обновлены по факту реализации; остальные (timeline, user journey) оставлены как исторический план и **не отражают текущее состояние** — актуальный статус см. в [Development Plan, раздел 0](./mvp-development-plan.md#0-статус-реализации-и-отклонения-от-плана) и в [чек-листе](./mvp-quick-start-checklist.md).

---

## Общая структура разработки

```mermaid
graph LR
    A[Фаза 0<br/>Инфраструктура] --> B[Фаза 1<br/>Аутентификация]
    B --> C[Фаза 2<br/>Продукты]
    C --> D[Фаза 3<br/>Исследования]
    D --> E[Фаза 4<br/>Сегменты]
    E --> F[Фаза 5<br/>Связи]
    F --> G[Фаза 6<br/>Полировка]
    G --> H[MVP Ready!]

    style A fill:#e1f5ff
    style B fill:#e1f5ff
    style C fill:#fff4e1
    style D fill:#fff4e1
    style E fill:#fff4e1
    style F fill:#e8f5e9
    style G fill:#f3e5f5
    style H fill:#c8e6c9
```

---

## Timeline разработки по фазам

```mermaid
gantt
    title MVP Development Timeline
    dateFormat YYYY-MM-DD
    section Инфраструктура
    Настройка окружения           :p0, 2026-08-04, 1d
    Инициализация проекта         :p0, 2026-08-04, 1d
    Настройка Prisma + NextAuth   :p0, 2026-08-05, 2d

    section Аутентификация
    Модель User + API             :p1, 2026-08-07, 2d
    UI формы входа/регистрации    :p1, 2026-08-08, 2d
    Layout и навигация            :p1, 2026-08-09, 2d

    section Модуль Продукты
    Модель Product + API          :p2, 2026-08-11, 2d
    UI формы и страницы           :p2, 2026-08-12, 2d
    Тестирование                  :p2, 2026-08-13, 1d

    section Модуль Исследования
    Модель Research + API         :p3, 2026-08-14, 2d
    UI список и фильтры           :p3, 2026-08-15, 2d
    Детальная страница            :p3, 2026-08-16, 1d
    Тестирование                  :p3, 2026-08-17, 1d

    section Модуль Сегменты
    Модель Segment + API          :p4, 2026-08-18, 2d
    UI карточки и формы           :p4, 2026-08-19, 2d
    Тестирование                  :p4, 2026-08-20, 1d

    section Связи и полировка
    Связи между модулями          :p5, 2026-08-21, 2d
    Обработка ошибок              :p5, 2026-08-22, 1d
    UI полировка                  :p5, 2026-08-23, 2d
    Финальное тестирование        :p5, 2026-08-25, 2d
```

---

## Архитектура системы (по факту реализации)

```mermaid
graph TB
    subgraph "Client Browser"
        UI[React UI<br/>Next.js 14]
    end

    subgraph "Next.js Server"
        RSC[Server Components<br/>чтение через Prisma напрямую]
        SA[Server Actions<br/>lib/actions/*.ts — мутации]
        AUTH[NextAuth.js<br/>настроен, не подключён к UI]
        PRISMA[Prisma ORM]
    end

    subgraph "Database"
        DB[(PostgreSQL)]
    end

    UI -->|RSC payload| RSC
    UI -->|form action| SA
    RSC --> PRISMA
    SA --> PRISMA
    AUTH -.->|не используется| PRISMA
    PRISMA --> DB

    style UI fill:#61dafb
    style RSC fill:#000000,color:#fff
    style SA fill:#000000,color:#fff
    style AUTH fill:#9333ea,color:#fff,stroke-dasharray: 5 5
    style PRISMA fill:#2d3748,color:#fff
    style DB fill:#336791,color:#fff
```

Плановая версия (REST API Routes + React Query) не реализовывалась — Server Actions оказались достаточны и проще для CRUD без клиентского кеша.

---

## Модули P0 и их приоритет

```mermaid
graph TD
    START[Начало разработки] --> INFRA[Инфраструктура<br/>Priority: P0]
    INFRA --> AUTH[Аутентификация<br/>Priority: P0]
    AUTH --> PROD[Продукты<br/>Priority: P0]
    PROD --> RES[Исследования<br/>Priority: P0]
    PROD --> SEG[Сегменты<br/>Priority: P0]
    RES --> LINKS[Связи между модулями]
    SEG --> LINKS
    LINKS --> MVP[MVP Ready]

    MVP -.->|Следующая итерация| P1[P1 Модули:<br/>JTBD, Разговоры, Гипотезы]
    P1 -.-> P2[P2 Модули:<br/>AI Chat, Генерация]

    style INFRA fill:#e3f2fd
    style AUTH fill:#e3f2fd
    style PROD fill:#fff3e0
    style RES fill:#fff3e0
    style SEG fill:#fff3e0
    style LINKS fill:#e8f5e9
    style MVP fill:#c8e6c9
    style P1 fill:#f3e5f5,stroke-dasharray: 5 5
    style P2 fill:#fce4ec,stroke-dasharray: 5 5
```

---

## Структура базы данных (ER-диаграмма, по факту реализации)

```mermaid
erDiagram
    USER ||--o{ PRODUCT : creates
    USER ||--o{ RESEARCH : creates
    USER ||--o{ SEGMENT : creates
    USER ||--o{ JTBD : creates
    USER ||--o{ HYPOTHESIS : creates
    PRODUCT ||--o{ RESEARCH : contains
    PRODUCT ||--o{ SEGMENT : contains
    PRODUCT ||--o{ JTBD : contains
    PRODUCT ||--o{ HYPOTHESIS : contains
    SEGMENT |o--o{ JTBD : "optional"
    RESEARCH |o--o{ JTBD : "optional"
    SEGMENT |o--o{ HYPOTHESIS : "optional"
    RESEARCH |o--o{ HYPOTHESIS : "optional"
    JTBD |o--o{ HYPOTHESIS : "optional"

    USER {
        string id PK
        string email UK
        string name
        string passwordHash
        datetime createdAt
    }

    PRODUCT {
        string id PK
        string name
        string slug UK
        text description
        enum stage
        string userId FK
    }

    RESEARCH {
        string id PK
        int number
        string title
        datetime date
        enum status
        enum type
        string productId FK
        string userId FK
    }

    SEGMENT {
        string id PK
        string name
        string slug
        float audienceShare
        string color
        string productId FK
        string userId FK
    }

    JTBD {
        string id PK
        string title
        string category
        boolean confirmed
        string productId FK
        string segmentId FK
        string researchId FK
        string userId FK
    }

    HYPOTHESIS {
        string id PK
        text statement
        enum status
        int priority
        string productId FK
        string jtbdId FK
        string segmentId FK
        string researchId FK
        string userId FK
    }
```

---

## Milestone и критерии успеха

```mermaid
graph LR
    M1[Milestone 1<br/>Инфраструктура] --> M2[Milestone 2<br/>Аутентификация]
    M2 --> M3[Milestone 3<br/>Продукты]
    M3 --> M4[Milestone 4<br/>Исследования]
    M4 --> M5[Milestone 5<br/>Сегменты]
    M5 --> M6[Milestone 6<br/>MVP Ready]

    M1 -.->|Критерии| C1[✓ Проект инициализирован<br/>✓ БД подключена<br/>✓ UI настроен]
    M2 -.->|Критерии| C2[✓ Регистрация работает<br/>✓ Вход работает<br/>✓ Layout создан]
    M3 -.->|Критерии| C3[✓ CRUD продуктов<br/>✓ Валидация<br/>✓ UI готов]
    M4 -.->|Критерии| C4[✓ CRUD исследований<br/>✓ Фильтрация<br/>✓ Привязка к продукту]
    M5 -.->|Критерии| C5[✓ CRUD сегментов<br/>✓ Цветовые метки<br/>✓ Привязка к продукту]
    M6 -.->|Критерии| C6[✓ Все модули работают<br/>✓ Связи настроены<br/>✓ UI отполирован]

    style M1 fill:#e3f2fd
    style M2 fill:#e3f2fd
    style M3 fill:#fff3e0
    style M4 fill:#fff3e0
    style M5 fill:#fff3e0
    style M6 fill:#c8e6c9
```

---

## Технологический стек

```mermaid
graph TB
    subgraph "Frontend Layer"
        NEXT[Next.js 14<br/>App Router]
        REACT[React 18]
        TAIL[TailwindCSS]
        SHADCN[shadcn/ui]
        RQ[React Query]
    end

    subgraph "Backend Layer"
        API[Next.js<br/>API Routes]
        AUTH[NextAuth.js]
        PRISMA[Prisma ORM]
    end

    subgraph "Data Layer"
        PG[(PostgreSQL 15+)]
    end

    subgraph "Validation & Forms"
        ZOD[Zod]
        RHF[React Hook Form]
    end

    NEXT --> REACT
    REACT --> TAIL
    REACT --> SHADCN
    REACT --> RQ
    REACT --> RHF
    RHF --> ZOD

    NEXT --> API
    API --> AUTH
    API --> PRISMA
    PRISMA --> PG

    style NEXT fill:#000000,color:#fff
    style REACT fill:#61dafb
    style TAIL fill:#06b6d4,color:#fff
    style SHADCN fill:#000000,color:#fff
    style RQ fill:#ff4154,color:#fff
    style API fill:#68a063,color:#fff
    style AUTH fill:#9333ea,color:#fff
    style PRISMA fill:#2d3748,color:#fff
    style PG fill:#336791,color:#fff
    style ZOD fill:#3e67b1,color:#fff
    style RHF fill:#ec5990,color:#fff
```

---

## Путь пользователя в MVP

```mermaid
graph TD
    START([Пользователь заходит<br/>на платформу]) --> REG{Есть аккаунт?}
    REG -->|Нет| REGISTER[Регистрация]
    REG -->|Да| LOGIN[Вход]
    REGISTER --> DASH[Дашборд]
    LOGIN --> DASH

    DASH --> ACTION{Что делать?}

    ACTION -->|Создать продукт| PROD[Создание продукта]
    ACTION -->|Добавить исследование| RES[Создание исследования]
    ACTION -->|Добавить сегмент| SEG[Создание сегмента]

    PROD --> PROD_VIEW[Просмотр профиля<br/>продукта]
    RES --> RES_LIST[Список исследований]
    SEG --> SEG_LIST[Список сегментов]

    PROD_VIEW --> PROD_EDIT{Редактировать?}
    PROD_EDIT -->|Да| PROD_FORM[Форма редактирования]
    PROD_EDIT -->|Нет| DASH
    PROD_FORM --> DASH

    RES_LIST --> RES_DETAIL[Детальная страница<br/>исследования]
    RES_DETAIL --> DASH

    SEG_LIST --> SEG_DETAIL[Детальная страница<br/>сегмента]
    SEG_DETAIL --> DASH

    style START fill:#e8f5e9
    style DASH fill:#fff3e0
    style PROD fill:#e3f2fd
    style RES fill:#e3f2fd
    style SEG fill:#e3f2fd
```

---

## Что реализовано vs что отложено (по факту, не по исходному плану)

```mermaid
graph TB
    subgraph "✅ Реализовано"
        MVP2[Управление продуктами]
        MVP3[Исследования]
        MVP4[Сегменты клиентов]
        MVP5[Связи между модулями]
        MVP6[Базовый UI]
        MVP7[JTBD — из P1, раньше срока]
        MVP8[Гипотезы — из P1, раньше срока]
    end

    subgraph "⚠️ Сознательно отложено"
        D1[Аутентификация<br/>email + password — заменена seed-пользователем]
        D2[Полировка UI: toast, loading states]
        D3[Фильтрация/поиск в списках]
    end

    subgraph "❌ Отложено на P1 (осталось)"
        P1_2[Разговоры CustDev]
        P1_4[Дашборд метрик]
    end

    subgraph "❌ Отложено на P2"
        P2_1[AI Chat]
        P2_2[Генерация гипотез]
        P2_3[Быстрый захват]
        P2_4[RAG система]
    end

    subgraph "❌ Отложено на P3"
        P3_1[Мультиязычность]
        P3_2[Интеграции]
        P3_3[Экспорт PDF/CSV]
        P3_4[Ролевая модель]
    end

    style MVP2 fill:#c8e6c9
    style MVP3 fill:#c8e6c9
    style MVP4 fill:#c8e6c9
    style MVP5 fill:#c8e6c9
    style MVP6 fill:#c8e6c9
    style MVP7 fill:#c8e6c9
    style MVP8 fill:#c8e6c9

    style D1 fill:#ffe0b2
    style D2 fill:#ffe0b2
    style D3 fill:#ffe0b2

    style P1_2 fill:#fff9c4
    style P1_4 fill:#fff9c4

    style P2_1 fill:#ffccbc
    style P2_2 fill:#ffccbc
    style P2_3 fill:#ffccbc
    style P2_4 fill:#ffccbc

    style P3_1 fill:#f3e5f5
    style P3_2 fill:#f3e5f5
    style P3_3 fill:#f3e5f5
    style P3_4 fill:#f3e5f5
```

---

## Риски и митигация

```mermaid
graph LR
    subgraph "Технические риски"
        R1[Сложность настройки<br/>Next.js + Prisma]
        R2[Проблемы с<br/>производительностью]
        R3[Сложность деплоя]
    end

    subgraph "Митигация"
        M1[Использовать<br/>официальные примеры]
        M2[Пагинация +<br/>индексы БД]
        M3[Vercel +<br/>Supabase]
    end

    R1 -.-> M1
    R2 -.-> M2
    R3 -.-> M3

    style R1 fill:#ffcdd2
    style R2 fill:#ffcdd2
    style R3 fill:#ffcdd2
    style M1 fill:#c8e6c9
    style M2 fill:#c8e6c9
    style M3 fill:#c8e6c9
```

---

## Следующие шаги после MVP

```mermaid
graph TD
    MVP[MVP Ready] --> FEEDBACK[Собрать feedback<br/>от пользователей]
    FEEDBACK --> ANALYZE[Проанализировать<br/>использование]
    ANALYZE --> DECIDE{Что приоритетнее?}

    DECIDE -->|Методология| P1A[Добавить JTBD]
    DECIDE -->|Данные| P1B[Добавить Разговоры]
    DECIDE -->|Приоритизация| P1C[Добавить Гипотезы]

    P1A --> P1_DONE[P1 Complete]
    P1B --> P1_DONE
    P1C --> P1_DONE

    P1_DONE --> P2[Планирование<br/>AI-инфраструктуры]
    P2 --> AI[Добавление<br/>AI-функций]

    style MVP fill:#c8e6c9
    style FEEDBACK fill:#fff3e0
    style P1_DONE fill:#e1bee7
    style AI fill:#f8bbd0
```

---

## Резюме

**MVP платформы ECHO** - это минимальная, но функциональная версия продукта, которая позволяет:

✅ **Управлять продуктами** - создавать профили продуктов с описанием и стадией  
✅ **Хранить исследования** - вести репозиторий клиентских исследований  
✅ **Сегментировать аудиторию** - создавать и управлять сегментами клиентов  
✅ **Связывать данные** - привязывать исследования и сегменты к продуктам

**Технологии:** Next.js 14, React 18, PostgreSQL, Prisma, NextAuth.js, TailwindCSS, shadcn/ui

**Для кого:** Solo-разработчик, работающий итеративно

**Результат:** Работающая платформа для product discovery с возможностью масштабирования
