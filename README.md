# ECHO Platform - MVP

Платформа для управления продуктовыми исследованиями и сегментами клиентов.

## Технологический стек

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **Styling:** TailwindCSS, shadcn/ui
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL 15+
- **ORM:** Prisma
- **Authentication:** NextAuth.js
- **State Management:** TanStack Query (React Query)
- **Forms:** React Hook Form + Zod

## Начало работы

### Предварительные требования

- Node.js 20+
- PostgreSQL 15+
- npm или yarn

### Установка

1. Клонируйте репозиторий:
```bash
git clone <repository-url>
cd rpm-platform
```

2. Установите зависимости:
```bash
npm install
```

3. Настройте переменные окружения:
```bash
cp .env.example .env.local
```

Отредактируйте `.env.local` и укажите правильные данные для подключения к PostgreSQL.

4. Инициализируйте базу данных:
```bash
npm run db:push
```

5. Запустите сервер разработки:
```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000) в браузере.

## Доступные команды

- `npm run dev` - запуск сервера разработки
- `npm run build` - сборка для production
- `npm run start` - запуск production сервера
- `npm run lint` - проверка кода линтером
- `npm run format` - форматирование кода с помощью Prettier
- `npm run db:push` - синхронизация схемы Prisma с БД
- `npm run db:studio` - открыть Prisma Studio
- `npm run db:generate` - генерация Prisma Client
- `npm run db:migrate` - создание и применение миграций

## Структура проекта

```
rpm-platform/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Группа маршрутов для аутентификации
│   ├── (dashboard)/       # Группа маршрутов для основного приложения
│   ├── api/               # API Routes
│   ├── layout.tsx         # Корневой layout
│   ├── page.tsx           # Главная страница
│   └── globals.css        # Глобальные стили
├── components/            # React компоненты
│   ├── ui/               # shadcn/ui компоненты
│   ├── forms/            # Формы
│   ├── layouts/          # Layouts
│   └── shared/           # Общие компоненты
├── lib/                  # Утилиты и конфигурация
│   ├── prisma.ts         # Prisma Client
│   ├── auth.ts           # NextAuth конфигурация
│   └── utils.ts          # Вспомогательные функции
├── types/                # TypeScript типы
├── prisma/               # Prisma схема и миграции
│   └── schema.prisma     # Схема базы данных
├── public/               # Статические файлы
└── plans/                # Документация и планы разработки
```

## Фазы разработки MVP

- [x] **Фаза 0:** Подготовка инфраструктуры
- [ ] **Фаза 1:** Аутентификация и базовый UI
- [ ] **Фаза 2:** Модуль "Продукты"
- [ ] **Фаза 3:** Модуль "Исследования"
- [ ] **Фаза 4:** Модуль "Сегменты"
- [ ] **Фаза 5:** Связи между модулями
- [ ] **Фаза 6:** Полировка и тестирование

## Документация

Подробная документация по разработке находится в директории [`plans/`](./plans/):

- [MVP Development Plan](./plans/mvp-development-plan.md) - полный план разработки
- [MVP Quick Start Checklist](./plans/mvp-quick-start-checklist.md) - быстрый чеклист
- [MVP Roadmap Visual](./plans/mvp-roadmap-visual.md) - визуальная дорожная карта

## Лицензия

См. файл [LICENSE](./LICENSE)
