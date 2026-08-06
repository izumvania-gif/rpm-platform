# План разработки MVP платформы ECHO

**Версия:** 1.2 (обновлено по факту реализации)  
**Дата:** 3 августа 2026, обновлено 6 августа 2026  
**Режим разработки:** Solo-разработчик  
**Технологический стек:** Next.js + Node.js + PostgreSQL + Python (AI)

---

## 0. Статус реализации и отклонения от плана

Раздел описывает, что фактически построено и чем это отличается от плана ниже. Сам план (разделы 1–12) оставлен как есть для истории — актуальный статус см. здесь и в [чек-листе](./mvp-quick-start-checklist.md).

**Готово:** Фаза 0 (инфраструктура), Фаза 2 (Продукты), Фаза 3 (Исследования), Фаза 4 (Сегменты), Фаза 5 (связи между модулями — частично), а также **JTBD, Гипотезы и Разговоры (CustDev) из P1** — реализованы раньше срока вместе с P0, т.к. были явно запрошены до завершения Фазы 6.

**Ключевые отклонения от плана:**

1. **Фаза 1 (аутентификация) отложена, а не реализована.** Экранов логина/регистрации нет. Вместо этого при первом запуске (`npm run db:seed`) создаётся один пользователь-владелец (`prisma/seed.ts`), и все записи неявно принадлежат ему через `lib/current-user.ts#getCurrentUserId()`. Модель `User` и конфигурация NextAuth (`lib/auth.ts`) в коде оставлены нетронутыми — когда экран логина понадобится, `getCurrentUserId()` меняется на чтение сессии, без миграции схемы.
2. **Архитектура API отличается от плана.** Вместо REST-эндпоинтов (`POST /api/products` и т.д.) и React Query используются **Server Components** для чтения (прямые запросы к Prisma в компонентах страниц) и **Server Actions** (`lib/actions/*.ts`) для мутаций. React Query и отдельные API-роуты для CRUD не используются — это сокращает объём кода примерно вдвое при той же функциональности. NextAuth-эндпоинт (`app/api/auth/[...nextauth]/route.ts`) — единственный настоящий API route в проекте.
3. **JTBD, Гипотезы и Разговоры (раздел 9.1, P1) пришли раньше очереди.** Модели `JTBD`, `Hypothesis` и `Conversation` в `prisma/schema.prisma`, полный CRUD для всех трёх, доска гипотез по статусам (упрощённый Kanban без drag-and-drop) — уже реализованы. Раздел 9.1 ниже устарел в этой части.
4. **Фаза 6 (полировка) не начата.** Нет toast-уведомлений, loading-skeleton, `ErrorBoundary`. Есть только базовая обработка ошибок форм (сообщение об ошибке над формой) и `confirm()` перед удалением.
5. **UI-библиотека:** компоненты shadcn/ui (`components/ui/*`) написаны вручную по образцу официального стиля, а не через `npx shadcn add` — CLI обращается к внешнему registry, недоступному в среде разработки на момент реализации.

---

## Исполнительное резюме

Этот план описывает поэтапную разработку MVP платформы ECHO для solo-разработчика. Фокус на модулях P0 с минимальным, но функциональным набором возможностей для валидации концепции и получения первых пользователей.

**Цель MVP:** Создать работающую платформу, где продакт-менеджер может хранить исследования, управлять сегментами клиентов и связывать их с профилем продукта.

**Критерий успеха MVP:** Один продакт-менеджер может полноценно использовать платформу для управления одним продуктом с базовыми функциями исследований и сегментации.

---

## 1. Архитектура MVP

### 1.1 Технологический стек

```mermaid
graph TB
    subgraph "Frontend"
        A[Next.js 14 App Router]
        B[React 18]
        C[TailwindCSS + shadcn/ui]
        D[React Query]
    end

    subgraph "Backend"
        E[Next.js API Routes]
        F[Prisma ORM]
        G[NextAuth.js]
    end

    subgraph "Database"
        H[(PostgreSQL 15+)]
    end

    subgraph "AI Services - Phase 2"
        I[Python FastAPI]
        J[LangChain]
        K[OpenAI API]
    end

    A --> E
    E --> F
    F --> H
    E --> G
    G --> H

    style I fill:#f9f,stroke:#333,stroke-dasharray: 5 5
    style J fill:#f9f,stroke:#333,stroke-dasharray: 5 5
    style K fill:#f9f,stroke:#333,stroke-dasharray: 5 5
```

### 1.2 Упрощения для MVP

**Что ВКЛЮЧАЕМ в MVP:**

- ✅ Монолитная архитектура (Next.js fullstack)
- ✅ Один workspace (без мультитенантности)
- ⚠️ ~~Базовая аутентификация (email + password)~~ — отложена, см. раздел 0. Используется один seed-пользователь без экрана логина
- ✅ Одна роль пользователя (admin)
- ✅ Только русский язык интерфейса
- ✅ Локальное хранилище файлов

**Что ОТКЛАДЫВАЕМ на потом:**

- ❌ AI-функции (Chat, генерация гипотез)
- ❌ Мультиязычность (EN)
- ❌ Интеграции (Яндекс.Метрика, LangFuse)
- ❌ Внешние агенты (MCP)
- ❌ Продвинутая ролевая модель
- ❌ Экспорт в PDF/CSV

---

## 2. Модули P0 для MVP

### 2.1 Управление продуктами (P0) — ✅ реализовано

**Минимальный функционал:**

- Создание одного продукта — ✅ (можно создавать сколько угодно, ограничения на "один продукт" нет)
- Поля: название, slug, описание (RU), стадия — ✅
- Редактирование профиля продукта — ✅
- Просмотр профиля продукта — ✅ (плюс списки связанных исследований/сегментов/JTBD/гипотез)

**Технические детали (по факту):**

- Модель `Product` в Prisma
- Server Actions (`lib/actions/products.ts`) вместо REST API
- Форма создания/редактирования (`components/forms/product-form.tsx`) с автоподстановкой slug из названия (транслитерация кириллицы)
- Страница просмотра профиля (`app/products/[id]/page.tsx`)

### 2.2 Исследования (P0) — ✅ реализовано

**Минимальный функционал:**

- Создание исследования вручную — ✅
- Поля: номер (автогенерация), название, дата, статус, тип, описание — ✅ (плюс теги)
- Список исследований (табличный вид) — ✅
- Просмотр карточки исследования — ✅
- Редактирование и удаление — ✅

**Технические детали (по факту):**

- Модель `Research` в Prisma
- Server Actions (`lib/actions/research.ts`)
- Табличный список без фильтрации по статусу/типу (отложено — см. раздел 0)
- Детальная страница исследования (`app/research/[id]/page.tsx`)

### 2.3 Сегменты клиентов (P0) — ✅ реализовано

**Минимальный функционал:**

- Создание сегмента — ✅
- Поля: название, slug, доля аудитории (%), цветовая метка, описание — ✅
- Список сегментов — ✅
- Просмотр и редактирование сегмента — ✅
- Привязка сегмента к продукту — ✅

**Технические детали (по факту):**

- Модель `Segment` в Prisma
- Server Actions (`lib/actions/segments.ts`)
- Карточный вид сегментов
- Цвет выбирается нативным `<input type="color">`, без предустановленной палитры

### 2.4 JTBD (P1, реализовано раньше срока) — ✅ реализовано

**Функционал:**

- Формулировка, категория (с автодополнением по уже введённым категориям), комментарий
- Флаг "подтверждён исследованием" + % покрытия на странице списка, сгруппированного по категориям
- Необязательные связи с сегментом и исследованием, обязательная связь с продуктом

**Технические детали:**

- Модель `JTBD` в Prisma, Server Actions (`lib/actions/jtbd.ts`)
- `app/jtbd/*` — список (группировка по категории), создание, детальная страница, редактирование

### 2.5 Гипотезы (P1, реализовано раньше срока) — ✅ реализовано

**Функционал:**

- Формулировка, статус (черновик / на проверке / подтверждена / опровергнута), приоритет
- Необязательные связи с JTBD, сегментом, исследованием, обязательная — с продуктом
- Доска по статусам (упрощённый Kanban, 4 колонки, без drag-and-drop) + быстрая смена статуса кнопками на детальной странице

**Технические детали:**

- Модель `Hypothesis` в Prisma, Server Actions (`lib/actions/hypotheses.ts`)
- `app/hypotheses/*` — доска, создание, детальная страница, редактирование

### 2.6 Разговоры / CustDev (P1, реализовано раньше срока) — ✅ реализовано

**Функционал:**

- Название, транскрипт/заметки (свободный текст), дата, теги
- Необязательные связи с сегментом и исследованием, обязательная связь с продуктом
- AI-обработка транскриптов (извлечение цитат/JTBD/болей) — из функциональных требований, **не реализована**, это P2

**Технические детали:**

- Модель `Conversation` в Prisma, Server Actions (`lib/actions/conversations.ts`)
- `app/conversations/*` — список (таблица), создание, детальная страница, редактирование

---

## 3. Структура базы данных

### 3.1 Схема Prisma (упрощенная для MVP)

> Ниже — исходная плановая схема (User/Product/Research/Segment) плюс блоки JTBD/Hypothesis, добавленные по факту реализации. Актуальный источник истины — `prisma/schema.prisma`.

```prisma
// Пользователи
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  passwordHash  String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  products      Product[]
  researches    Research[]
  segments      Segment[]
}

// Продукты
model Product {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  description String?  @db.Text
  stage       Stage    @default(IDEA)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  researches  Research[]
  segments    Segment[]
}

enum Stage {
  IDEA
  MVP
  GROWTH
  SCALE
}

// Исследования
model Research {
  id          String         @id @default(cuid())
  number      Int            @default(autoincrement())
  title       String
  description String?        @db.Text
  date        DateTime       @default(now())
  status      ResearchStatus @default(IN_PROGRESS)
  type        ResearchType
  tags        String[]
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  productId   String
  product     Product        @relation(fields: [productId], references: [id], onDelete: Cascade)

  userId      String
  user        User           @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum ResearchStatus {
  IN_PROGRESS
  COMPLETED
}

enum ResearchType {
  QUALITATIVE
  SURVEY
  ANALYTICS
  DESK_RESEARCH
  MANUAL
  QUANTITATIVE
  USABILITY_TESTING
}

// Сегменты
model Segment {
  id              String   @id @default(cuid())
  name            String
  slug            String
  audienceShare   Float?   // процент от 0 до 100
  color           String   @default("#3B82F6")
  description     String?  @db.Text
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  productId       String
  product         Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([productId, slug])
}

// JTBD (Jobs-to-be-Done) — добавлено по факту реализации, изначально планировалось в P1
model JTBD {
  id          String   @id @default(cuid())
  title       String
  category    String
  description String?  @db.Text
  confirmed   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  productId   String
  product     Product   @relation(fields: [productId], references: [id], onDelete: Cascade)

  segmentId   String?
  segment     Segment?  @relation(fields: [segmentId], references: [id], onDelete: SetNull)

  researchId  String?
  research    Research? @relation(fields: [researchId], references: [id], onDelete: SetNull)

  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  hypotheses  Hypothesis[]
}

// Гипотезы — добавлено по факту реализации, изначально планировалось в P1
model Hypothesis {
  id         String           @id @default(cuid())
  statement  String           @db.Text
  status     HypothesisStatus @default(DRAFT)
  priority   Int?
  createdAt  DateTime         @default(now())
  updatedAt  DateTime         @updatedAt

  productId  String
  product    Product   @relation(fields: [productId], references: [id], onDelete: Cascade)

  jtbdId     String?
  jtbd       JTBD?     @relation(fields: [jtbdId], references: [id], onDelete: SetNull)

  segmentId  String?
  segment    Segment?  @relation(fields: [segmentId], references: [id], onDelete: SetNull)

  researchId String?
  research   Research? @relation(fields: [researchId], references: [id], onDelete: SetNull)

  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum HypothesisStatus {
  DRAFT
  IN_REVIEW
  CONFIRMED
  REJECTED
}
```

### 3.2 ER-диаграмма (актуальная, с JTBD/Hypothesis/Conversation)

```mermaid
erDiagram
    USER ||--o{ PRODUCT : creates
    USER ||--o{ RESEARCH : creates
    USER ||--o{ SEGMENT : creates
    USER ||--o{ JTBD : creates
    USER ||--o{ HYPOTHESIS : creates
    USER ||--o{ CONVERSATION : creates
    PRODUCT ||--o{ RESEARCH : contains
    PRODUCT ||--o{ SEGMENT : contains
    PRODUCT ||--o{ JTBD : contains
    PRODUCT ||--o{ HYPOTHESIS : contains
    PRODUCT ||--o{ CONVERSATION : contains
    SEGMENT |o--o{ JTBD : "optionally linked"
    RESEARCH |o--o{ JTBD : "optionally linked"
    SEGMENT |o--o{ HYPOTHESIS : "optionally linked"
    RESEARCH |o--o{ HYPOTHESIS : "optionally linked"
    JTBD |o--o{ HYPOTHESIS : "optionally linked"
    SEGMENT |o--o{ CONVERSATION : "optionally linked"
    RESEARCH |o--o{ CONVERSATION : "optionally linked"

    USER {
        string id PK
        string email UK
        string name
        string passwordHash
        datetime createdAt
        datetime updatedAt
    }

    PRODUCT {
        string id PK
        string name
        string slug UK
        text description
        enum stage
        string userId FK
        datetime createdAt
        datetime updatedAt
    }

    RESEARCH {
        string id PK
        int number
        string title
        text description
        datetime date
        enum status
        enum type
        string[] tags
        string productId FK
        string userId FK
        datetime createdAt
        datetime updatedAt
    }

    SEGMENT {
        string id PK
        string name
        string slug
        float audienceShare
        string color
        text description
        string productId FK
        string userId FK
        datetime createdAt
        datetime updatedAt
    }

    JTBD {
        string id PK
        string title
        string category
        text description
        boolean confirmed
        string productId FK
        string segmentId FK
        string researchId FK
        string userId FK
        datetime createdAt
        datetime updatedAt
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
        datetime createdAt
        datetime updatedAt
    }

    CONVERSATION {
        string id PK
        string title
        text transcript
        datetime date
        string[] tags
        string productId FK
        string segmentId FK
        string researchId FK
        string userId FK
        datetime createdAt
        datetime updatedAt
    }
```

---

## 4. Поэтапный план разработки

### Фаза 0: Подготовка инфраструктуры

**Задачи:**

- Инициализация Next.js проекта с TypeScript
- Настройка Prisma + PostgreSQL
- Настройка TailwindCSS + shadcn/ui
- Настройка NextAuth.js для аутентификации
- Настройка ESLint + Prettier
- Создание базовой структуры проекта

**Структура проекта:**

```
rpm-platform/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Группа маршрутов для аутентификации
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/       # Группа маршрутов для основного приложения
│   │   │   ├── products/
│   │   │   ├── researches/
│   │   │   └── segments/
│   │   ├── api/               # API Routes
│   │   │   ├── auth/
│   │   │   ├── products/
│   │   │   ├── researches/
│   │   │   └── segments/
│   │   └── layout.tsx
│   ├── components/            # React компоненты
│   │   ├── ui/               # shadcn/ui компоненты
│   │   ├── forms/            # Формы
│   │   ├── layouts/          # Layouts
│   │   └── shared/           # Общие компоненты
│   ├── lib/                  # Утилиты и конфигурация
│   │   ├── prisma.ts
│   │   ├── auth.ts
│   │   └── utils.ts
│   └── types/                # TypeScript типы
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
├── .env.local
├── next.config.js
├── tailwind.config.ts
└── package.json
```

**Ключевые библиотеки:**

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@prisma/client": "^5.15.0",
    "next-auth": "^4.24.0",
    "@tanstack/react-query": "^5.45.0",
    "zod": "^3.23.0",
    "react-hook-form": "^7.51.0",
    "@hookform/resolvers": "^3.6.0",
    "date-fns": "^3.6.0",
    "lucide-react": "^0.395.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "prisma": "^5.15.0",
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.0",
    "tailwindcss": "^3.4.0",
    "eslint": "^8.57.0",
    "prettier": "^3.3.0"
  }
}
```

---

### Фаза 1: Аутентификация и базовый UI — ⚠️ ОТЛОЖЕНА

Экраны логина/регистрации не строились. Вместо этого используется один seed-пользователь (`prisma/seed.ts`, `lib/current-user.ts`) — см. раздел 0 для деталей и обоснования. Базовый layout (шапка с навигацией) реализован в рамках Фазы 2, отдельного `DashboardLayout`/`Sidebar`/`Header` нет — навигация — это один компонент `components/shared/site-nav.tsx`.

**Задачи (план, не выполнено):**

- Реализация регистрации пользователя
- Реализация входа/выхода
- Создание защищенных маршрутов
- Базовый layout приложения (header, sidebar, main)
- Навигационное меню

**Компоненты:**

- `LoginForm` - форма входа
- `RegisterForm` - форма регистрации
- `DashboardLayout` - основной layout
- `Sidebar` - боковое меню
- `Header` - шапка с профилем пользователя

**API endpoints:**

- `POST /api/auth/register` - регистрация
- NextAuth.js endpoints для аутентификации

---

### Фаза 2: Модуль "Продукты" — ✅ ЗАВЕРШЕНА

**Задачи:**

- Создание модели Product в Prisma
- API endpoints для CRUD операций
- Форма создания продукта
- Страница профиля продукта
- Форма редактирования продукта

**Компоненты:**

- `ProductForm` - форма создания/редактирования
- `ProductProfile` - страница профиля продукта
- `ProductCard` - карточка продукта
- `StageSelect` - выбор стадии продукта

**API endpoints (план) → по факту Server Actions:**

- ~~`POST /api/products`~~ → `createProduct(formData)` в `lib/actions/products.ts`
- ~~`GET /api/products/:id`~~ → прямой запрос Prisma в `app/products/[id]/page.tsx` (Server Component)
- ~~`PUT /api/products/:id`~~ → `updateProduct(id, formData)`
- ~~`DELETE /api/products/:id`~~ → `deleteProduct(id)`

**Валидация (Zod):**

```typescript
const productSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'Только латиница, цифры и дефис'),
  description: z.string().optional(),
  stage: z.enum(['IDEA', 'MVP', 'GROWTH', 'SCALE']),
})
```

---

### Фаза 3: Модуль "Исследования" — ✅ ЗАВЕРШЕНА (без фильтрации/поиска)

**Задачи:**

- Создание модели Research в Prisma
- API endpoints для CRUD операций
- Список исследований с фильтрацией
- Форма создания исследования
- Детальная страница исследования
- Редактирование и удаление

**Компоненты:**

- `ResearchList` - список исследований
- `ResearchForm` - форма создания/редактирования
- `ResearchCard` - карточка исследования
- `ResearchDetail` - детальная страница
- `ResearchFilters` - фильтры (по статусу, типу)
- `StatusBadge` - бейдж статуса

**API endpoints (план) → по факту Server Actions:**

- ~~`GET /api/researches`~~ → прямой запрос Prisma в `app/research/page.tsx`, без фильтров
- ~~`POST /api/researches`~~ → `createResearch(formData)` в `lib/actions/research.ts`
- ~~`GET /api/researches/:id`~~ → прямой запрос Prisma в `app/research/[id]/page.tsx`
- ~~`PUT /api/researches/:id`~~ → `updateResearch(id, formData)`
- ~~`DELETE /api/researches/:id`~~ → `deleteResearch(id)`

**Функции:**

- Автогенерация номера исследования — ✅
- ~~Фильтрация по статусу и типу~~ — не реализовано
- Сортировка по дате — ✅
- ~~Поиск по названию~~ — не реализовано

---

### Фаза 4: Модуль "Сегменты" — ✅ ЗАВЕРШЕНА (без предустановленной палитры)

**Задачи:**

- Создание модели Segment в Prisma
- API endpoints для CRUD операций
- Список сегментов (карточный вид)
- Форма создания сегмента
- Детальная страница сегмента
- Цветовые метки

**Компоненты:**

- `SegmentList` - список сегментов
- `SegmentForm` - форма создания/редактирования
- `SegmentCard` - карточка сегмента
- `SegmentDetail` - детальная страница
- `ColorPicker` - выбор цвета

**API endpoints (план) → по факту Server Actions:**

- ~~`GET /api/segments`~~ → прямой запрос Prisma в `app/segments/page.tsx`
- ~~`POST /api/segments`~~ → `createSegment(formData)` в `lib/actions/segments.ts`
- ~~`GET /api/segments/:id`~~ → прямой запрос Prisma в `app/segments/[id]/page.tsx`
- ~~`PUT /api/segments/:id`~~ → `updateSegment(id, formData)`
- ~~`DELETE /api/segments/:id`~~ → `deleteSegment(id)`

**Функции:**

- ~~Предустановленные цвета (8-10 вариантов)~~ → нативный `<input type="color">`, произвольный выбор
- Валидация доли аудитории (0-100%) — ✅
- Уникальность slug в рамках продукта — ✅ (`@@unique([productId, slug])`)

---

### Фаза 5: Связи между модулями — ✅ ЗАВЕРШЕНА (без отдельной фильтрации списков)

**Задачи:**

- Привязка исследований к продукту — ✅
- Привязка сегментов к продукту — ✅
- Отображение связанных данных — ✅ (плюс JTBD и гипотезы)
- ~~Фильтрация по продукту~~ — списки (`/research`, `/segments`, `/jtbd`, `/hypotheses`) показывают всё сразу, без глобального фильтра по продукту; связи видны через страницу продукта

**Компоненты (по факту):**

- ~~`ProductSelector`~~ отдельным переиспользуемым компонентом не выделен — выбор продукта встроен в каждую форму (`<Select name="productId">`), с клиентской фильтрацией зависимых полей (сегмент/исследование/JTBD) по выбранному продукту
- Список связанных исследований/сегментов/JTBD/гипотез — прямо на `app/products/[id]/page.tsx`, без отдельных `RelatedResearches`/`RelatedSegments` компонентов

**Функции:**

- Каскадное удаление — ✅ (`onDelete: Cascade` от Product; `onDelete: SetNull` для необязательных связей Segment/Research у JTBD и Hypothesis)
- Счетчики (количество исследований, сегментов, JTBD, гипотез в продукте) — ✅, также на дашборде
- ~~Фильтрация списков по выбранному продукту~~ — не реализована

---

### Фаза 6: Полировка и тестирование — ❌ НЕ НАЧАТА

**Задачи:**

- Обработка ошибок и валидация
- Loading states и skeleton screens
- Пустые состояния (empty states)
- Подтверждение удаления
- Toast уведомления
- Адаптивная верстка (responsive design)
- Ручное тестирование всех функций

**Компоненты:**

- `ErrorBoundary` - обработка ошибок
- `LoadingSpinner` - индикатор загрузки
- `EmptyState` - пустое состояние
- `ConfirmDialog` - диалог подтверждения
- `Toast` - уведомления

**Тестирование:**

- Создание, редактирование, удаление всех сущностей
- Валидация форм
- Обработка ошибок API
- Проверка на разных разрешениях экрана

---

## 5. Milestone и чекпоинты

> Статус ✅/❌ ниже отражает фактическую реализацию, не план.

### Milestone 1: Инфраструктура готова — ✅ ДОСТИГНУТ

**Критерии:**

- ✅ Проект инициализирован
- ✅ База данных подключена
- ❌ Аутентификация — отложена (см. раздел 0)
- ✅ Базовый UI создан

### Milestone 2: Модуль "Продукты" работает — ✅ ДОСТИГНУТ

**Критерии:**

- ✅ Можно создать продукт
- ✅ Можно просмотреть профиль продукта
- ✅ Можно отредактировать продукт
- ✅ Можно удалить продукт

### Milestone 3: Модуль "Исследования" работает — ✅ ДОСТИГНУТ

**Критерии:**

- ✅ Можно создать исследование
- ✅ Список исследований отображается
- ❌ Фильтрация — не реализована
- ✅ Детальная страница работает
- ✅ Редактирование и удаление работают

### Milestone 4: Модуль "Сегменты" работает — ✅ ДОСТИГНУТ

**Критерии:**

- ✅ Можно создать сегмент
- ✅ Список сегментов отображается
- ✅ Цветовые метки работают
- ✅ Детальная страница работает
- ✅ Редактирование и удаление работают

### Milestone 4.5: JTBD, Гипотезы и Разговоры работают (P1, реализовано раньше срока) — ✅ ДОСТИГНУТ

**Критерии:**

- ✅ Можно создать JTBD со связью с продуктом/сегментом/исследованием
- ✅ Список JTBD сгруппирован по категориям с % подтверждения
- ✅ Можно создать гипотезу со связью с продуктом/JTBD/сегментом/исследованием
- ✅ Доска гипотез по статусам, быстрая смена статуса
- ✅ Можно создать разговор со связью с продуктом/сегментом/исследованием, тегами и транскриптом

### Milestone 5: MVP готов к использованию — ⚠️ ЧАСТИЧНО

**Критерии:**

- ✅ Все модули P0 работают (плюс JTBD/Гипотезы из P1)
- ✅ Связи между модулями работают
- ⚠️ Обработка ошибок — только базовая (сообщения над формой, `confirm()` перед удалением), без toast/ErrorBoundary
- ❌ UI не отполирован (Фаза 6 не начата)
- ⚠️ Адаптивная верстка — не проверялась специально (используется Tailwind, но без ручного прохода по брейкпоинтам)
- ⚠️ Ручное тестирование — пройдено через автоматизированный browser-flow (Playwright), не по сценариям раздела 7.1

---

## 6. Технические решения для ускорения разработки

### 6.1 UI компоненты

**Использовать shadcn/ui** - готовые компоненты:

- Button, Input, Select, Textarea
- Dialog, Sheet, Popover
- Table, Card, Badge
- Form (с react-hook-form)
- Toast (для уведомлений)

### 6.2 Формы

**React Hook Form + Zod:**

- Автоматическая валидация
- Типобезопасность
- Минимум кода

### 6.3 Работа с API

**React Query (TanStack Query):**

- Кеширование запросов
- Автоматическая ревалидация
- Optimistic updates
- Loading и error states из коробки

### 6.4 Стилизация

**TailwindCSS:**

- Быстрая разработка UI
- Консистентный дизайн
- Адаптивность из коробки

### 6.5 База данных

**Prisma ORM:**

- Типобезопасные запросы
- Автоматические миграции
- Prisma Studio для отладки

---

## 7. План тестирования MVP

### 7.1 Ручное тестирование

**Сценарий 1: Регистрация и вход**

1. Зарегистрировать нового пользователя
2. Выйти из системы
3. Войти с созданными учетными данными
4. Проверить, что данные пользователя отображаются

**Сценарий 2: Работа с продуктом**

1. Создать новый продукт
2. Просмотреть профиль продукта
3. Отредактировать продукт
4. Проверить, что изменения сохранились
5. Попытаться создать продукт с дублирующимся slug (должна быть ошибка)

**Сценарий 3: Работа с исследованиями**

1. Создать исследование для продукта
2. Проверить, что номер автоматически сгенерирован
3. Просмотреть список исследований
4. Отфильтровать по статусу
5. Открыть детальную страницу
6. Отредактировать исследование
7. Удалить исследование (с подтверждением)

**Сценарий 4: Работа с сегментами**

1. Создать сегмент для продукта
2. Выбрать цветовую метку
3. Просмотреть список сегментов
4. Проверить, что цвет отображается корректно
5. Отредактировать сегмент
6. Удалить сегмент

**Сценарий 5: Связи между модулями**

1. Создать продукт
2. Создать несколько исследований для этого продукта
3. Создать несколько сегментов для этого продукта
4. Проверить, что на странице продукта отображаются связанные данные
5. Удалить продукт
6. Проверить, что связанные исследования и сегменты тоже удалились

### 7.2 Тестирование граничных случаев

- Пустые формы (валидация)
- Очень длинные тексты
- Специальные символы в полях
- Дублирующиеся данные (slug, email)
- Удаление несуществующих записей
- Доступ к чужим данным (должен быть запрещен)

### 7.3 Тестирование UI

- Проверка на разных разрешениях (desktop, tablet, mobile)
- Проверка темной темы (если реализована)
- Проверка loading states
- Проверка empty states
- Проверка error states

---

## 8. Критерии готовности MVP

### 8.1 Функциональные критерии

- ✅ Пользователь может зарегистрироваться и войти
- ✅ Пользователь может создать продукт
- ✅ Пользователь может создать исследование и привязать к продукту
- ✅ Пользователь может создать сегмент и привязать к продукту
- ✅ Пользователь может просматривать, редактировать и удалять все сущности
- ✅ Все формы валидируются корректно
- ✅ Ошибки обрабатываются и отображаются пользователю

### 8.2 Технические критерии

- ✅ Код следует best practices Next.js и React
- ✅ TypeScript используется везде без any
- ✅ База данных нормализована
- ✅ API endpoints защищены аутентификацией
- ✅ Нет критических багов
- ✅ Приложение работает стабильно

### 8.3 UX критерии

- ✅ Интерфейс интуитивно понятен
- ✅ Все действия имеют feedback (loading, success, error)
- ✅ Навигация логична и последовательна
- ✅ Формы удобны для заполнения
- ✅ Адаптивная верстка работает на всех устройствах

---

## 9. Что делать после MVP

### 9.1 Приоритет P1 (следующая итерация)

**Модули для добавления:**

- ~~JTBD (Jobs-to-be-Done)~~ — ✅ реализовано, см. раздел 2.4
- ~~Разговоры (CustDev)~~ — ✅ реализовано, см. раздел 2.6
- ~~Гипотезы~~ — ✅ реализовано, см. раздел 2.5
- Аутентификация (Фаза 1 из исходного плана) — осталось сделать, когда понадобится больше одного пользователя
- Выводы ("findings") исследований и дорожная карта/timeline-вид для исследований — из функциональных требований, не начаты
- AI-обработка транскриптов разговоров (извлечение цитат/JTBD/болей) — из функциональных требований, это уже P2 (AI-функции)

**Связи:**

- ~~Привязка JTBD к сегментам и исследованиям~~ — ✅ реализовано
- ~~Привязка разговоров к исследованиям и сегментам~~ — ✅ реализовано
- ~~Привязка гипотез к JTBD~~ — ✅ реализовано (плюс к сегменту и исследованию)

### 9.2 Приоритет P2 (AI-функции)

**AI-инфраструктура:**

- Настройка Python FastAPI сервиса
- Интеграция с OpenAI API
- Реализация RAG (Retrieval-Augmented Generation)
- AI Chat с контекстом продукта
- Быстрый захват через AI

### 9.3 Улучшения платформы

**Функциональные:**

- Мультипродуктовость (переключение между продуктами)
- Ролевая модель (admin, analyst, viewer)
- Экспорт данных (PDF, CSV)
- Дашборд с метриками

**Технические:**

- Миграция на мультитенантность
- Интеграции (Яндекс.Метрика, LangFuse)
- Мультиязычность (EN)
- Облачное хранилище файлов (S3)

---

## 10. Риски и митигация

### 10.1 Технические риски

**Риск:** Сложность настройки Next.js + Prisma + NextAuth  
**Митигация:** Использовать официальные примеры и документацию, начать с простейшей конфигурации

**Риск:** Проблемы с производительностью при росте данных  
**Митигация:** Добавить пагинацию с первой версии, использовать индексы в БД

**Риск:** Сложность деплоя  
**Митигация:** Использовать Vercel для Next.js (бесплатный tier), Supabase для PostgreSQL

### 10.2 Продуктовые риски

**Риск:** MVP слишком минималистичен для реальных пользователей  
**Митигация:** Провести интервью с потенциальными пользователями после Milestone 3

**Риск:** Отсутствие AI-функций снижает ценность  
**Митигация:** Сфокусироваться на качестве базовых функций, добавить AI в P2

**Риск:** Конкуренция с существующими решениями  
**Митигация:** Подчеркнуть уникальность методологии JTBD → Фича → RTB

---

## 11. Рекомендации по разработке

### 11.1 Для solo-разработчика

1. **Работайте итеративно:** Завершайте одну фазу полностью перед переходом к следующей
2. **Тестируйте часто:** После каждой фичи проверяйте, что ничего не сломалось
3. **Используйте готовые решения:** shadcn/ui, React Query, Prisma экономят массу времени
4. **Не перфекционируйте:** MVP должен работать, а не быть идеальным
5. **Документируйте решения:** Ведите changelog и записывайте важные решения
6. **Делайте коммиты часто:** Маленькие коммиты с понятными сообщениями
7. **Используйте TypeScript строго:** Это сэкономит время на отладке

### 11.2 Инструменты для ускорения

- **Prisma Studio** - визуальный редактор БД
- **React DevTools** - отладка компонентов
- **Postman/Insomnia** - тестирование API
- **Vercel** - быстрый деплой
- **GitHub Copilot** - помощь с кодом (опционально)

### 11.3 Когда обращаться за помощью

- Если застряли на одной проблеме больше 2 часов
- Если нужно принять архитектурное решение
- Если нужен код-ревью перед важным рефакторингом
- Если нужна помощь с деплоем

---

## 12. Следующие шаги

### Немедленные действия:

1. **Создать репозиторий:** Инициализировать Git репозиторий
2. **Настроить окружение:** Установить Node.js, PostgreSQL, VS Code
3. **Начать Фазу 0:** Инициализация проекта
4. **Создать первый коммит:** "Initial commit: project setup"

### Долгосрочные действия:

1. **Следовать плану фаз:** Последовательно проходить Фазы 0-6
2. **Отмечать milestone:** Праздновать достижение каждого milestone
3. **Собирать feedback:** После Milestone 3 показать MVP потенциальным пользователям
4. **Планировать P1:** После завершения MVP начать планирование следующей итерации

---

## Заключение

Этот план разработки MVP платформы ECHO оптимизирован для solo-разработчика и фокусируется на быстром создании работающего продукта с минимальным, но функциональным набором возможностей.

**Ключевые принципы:**

- 🎯 Фокус на P0 модулях
- ⚡ Использование готовых решений для ускорения
- 🔄 Итеративная разработка с четкими milestone
- 🧪 Постоянное тестирование
- 📦 Простота вместо перфекционизма

**Ожидаемый результат:** Работающая платформа, где продакт-менеджер может управлять продуктом, исследованиями и сегментами клиентов с удобным веб-интерфейсом.

**Готовность к масштабированию:** Архитектура MVP позволяет легко добавлять новые модули (P1, P2) без необходимости переписывать существующий код.

---

**Удачи в разработке! 🚀**
