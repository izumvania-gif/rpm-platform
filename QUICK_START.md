# 🚀 Быстрый старт ECHO Platform

## Предварительные требования

- Node.js 20+ установлен
- PostgreSQL 15+ установлен и запущен
- npm или yarn

## Шаг 1: Установка зависимостей

```bash
npm install
```

## Шаг 2: Настройка базы данных

1. Создайте базу данных PostgreSQL:

```bash
createdb rpm_platform
```

2. Настройте переменные окружения:

```bash
cp .env.example .env.local
```

3. Отредактируйте `.env.local` и укажите правильный `DATABASE_URL`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/rpm_platform?schema=public"
```

4. Примените схему к базе данных:

```bash
npm run db:push
```

## Шаг 3: Запуск приложения

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000) в браузере.

## Полезные команды

### Разработка

```bash
npm run dev          # Запуск dev сервера
npm run build        # Сборка для production
npm run start        # Запуск production сервера
```

### База данных

```bash
npm run db:push      # Синхронизация схемы с БД
npm run db:studio    # Открыть Prisma Studio (GUI для БД)
npm run db:generate  # Генерация Prisma Client
npm run db:migrate   # Создание миграций
```

### Качество кода

```bash
npm run lint         # Проверка кода
npm run format       # Форматирование кода
```

## Структура проекта

```
rpm-platform/
├── app/              # Next.js App Router (страницы и API)
├── components/       # React компоненты
├── lib/             # Утилиты (Prisma, Auth, Utils)
├── types/           # TypeScript типы
├── prisma/          # Схема базы данных
└── plans/           # Документация разработки
```

## Следующие шаги

1. ✅ **Фаза 0 завершена** - инфраструктура готова
2. 🔄 **Фаза 1** - создание аутентификации и базового UI
3. ⏳ **Фаза 2** - модуль "Продукты"
4. ⏳ **Фаза 3** - модуль "Исследования"
5. ⏳ **Фаза 4** - модуль "Сегменты"

## Документация

- [MVP Development Plan](./plans/mvp-development-plan.md) - полный план разработки
- [Phase 0 Completion](./plans/phase-0-completion.md) - отчет о завершении Фазы 0
- [README.md](./README.md) - основная документация

## Помощь

Если возникли проблемы:

1. Убедитесь, что PostgreSQL запущен
2. Проверьте правильность `DATABASE_URL` в `.env.local`
3. Выполните `npm run db:generate` для регенерации Prisma Client
4. Проверьте логи в терминале

## Технологии

- **Frontend:** Next.js 14, React 18, TypeScript
- **Styling:** TailwindCSS, shadcn/ui
- **Backend:** Next.js API Routes, Prisma ORM
- **Database:** PostgreSQL
- **Auth:** NextAuth.js
