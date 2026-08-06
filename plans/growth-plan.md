# Growth Plan: расширение платформы ECHO

**Дата:** 6 августа 2026
**Статус:** Согласован с продакт-менеджером (см. раздел "Принятые решения"), к реализации

---

## Северная звезда

Платформа существует, чтобы: собрать всю доступную информацию о продукте → понять, какие реальные задачи (jobs) решают клиенты → связать эти задачи с сегментами, у которых они есть → подтвердить это исследованиями и разговорами → показать, где картина неполная или противоречивая, чтобы продакт-менеджер мог действовать.

Каждая фича ниже должна либо добавлять новую **связанную** информацию, либо помогать **увидеть инсайт/пробел** в уже собранной информации — не быть просто ещё одним списком CRUD.

---

## Принятые решения

| Вопрос                                                                            | Решение                                                                                                                                        |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Модель ресурсов продукта (sales-kit, dev-docs, будущие ссылки на Confluence/Jira) | Одна гибкая модель `ProductResource` с полем `kind` (enum), а не отдельная модель на каждый тип                                                |
| Модель конкурентов                                                                | Отдельная первоклассная модель `Competitor` (не через `ProductResource`)                                                                       |
| Глубина иерархии JTBD                                                             | Произвольная глубина (большая задача → задача → микро-задача → ...), один родитель на запись, у родителя может быть много детей                |
| Последовательность JTBD                                                           | Отдельная связь "следует за" (граф рёбер), независимая от иерархии; применима на любом уровне вложенности, не только к задачам верхнего уровня |
| UI графа JTBD                                                                     | Полноценный визуальный канвас (drag-and-drop, соединение узлов) — сразу, не откладывается на вторую фазу                                       |
| Слой Feature → RTB                                                                | Включить в эту фазу — это методологическое ядро платформы (JTBD → Feature → RTB), сейчас отсутствует полностью                                 |

---

## Фаза A: Контекст продукта и методологическое ядро

### A.1 `Competitor` — конкуренты

Первоклассная модель, привязанная к продукту.

```prisma
model Competitor {
  id          String   @id @default(cuid())
  name        String
  url         String?
  positioning String?  @db.Text   // позиционирование, профиль
  features    String[]            // краткий список фич конкурента (теги)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  productId   String
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

UI: список/карточки на отдельной странице `/competitors` (как Segments) + секция на странице продукта, как у остальных модулей.

### A.2 `ProductResource` — sales-kit, dev-docs, будущие интеграции

Одна гибкая модель вместо отдельной таблицы на каждый тип контента.

```prisma
enum ProductResourceKind {
  SALES_KIT
  DEVELOPER_DOC
  CONFLUENCE_LINK
  JIRA_LINK
  OTHER
}

model ProductResource {
  id          String              @id @default(cuid())
  title       String
  kind        ProductResourceKind
  url         String?
  description String?             @db.Text
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt

  productId   String
  product     Product             @relation(fields: [productId], references: [id], onDelete: Cascade)
  userId      String
  user        User                @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Confluence/Jira — важно:** на этом этапе `CONFLUENCE_LINK`/`JIRA_LINK` — это просто заголовок + URL + заметка, без реального API-подключения (OAuth, синхронизация страниц/задач). Когда понадобится живая интеграция, эти два `kind` "выделяются" в собственные модели с реальными полями (project key, space id, статус синхронизации) — по той же логике, по которой авторизация была отложена, но модель `User` осталась нетронутой для лёгкого возврата.

UI: секция "Ресурсы" на странице продукта, с фильтром по `kind`; форма создания — простая (title, kind-select, url, description).

### A.3 `Feature` и `RTB` — ядро методологии JTBD → Feature → RTB

Сейчас у JTBD нет способа связаться с "как продукт это решает" — это половина заявленной цели платформы. Добавляем два новых уровня.

```prisma
model Feature {
  id          String   @id @default(cuid())
  name        String
  description String?  @db.Text
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  productId   String
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  jtbds       JTBD[]   // many-to-many: одна фича может закрывать несколько задач
  rtbs        RTB[]    // many-to-many: фича может поддерживать несколько промо-обещаний
}

model RTB {
  id          String    @id @default(cuid())
  statement   String    @db.Text  // формулировка обещания
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  productId   String
  product     Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  features    Feature[] // many-to-many
}
```

`JTBD` получает поле `features Feature[]` (обратная сторона many-to-many).

UI: `/features` и `/rtb` как отдельные модули (список/карточка/форма, как остальные), плюс на странице JTBD — список привязанных фич, на странице Feature — список задач, которые она закрывает, и RTB, которые на ней основаны. Это и есть "connecting all the information": один клик с задачи клиента до маркетингового обещания, которое из неё выросло.

---

## Фаза B: Граф JTBD

### B.1 Иерархия

```prisma
model JTBD {
  // ...существующие поля...
  parentId String?
  parent   JTBD?   @relation("JtbdHierarchy", fields: [parentId], references: [id], onDelete: SetNull)
  children JTBD[]  @relation("JtbdHierarchy")
}
```

Один родитель, произвольная глубина, у родителя может быть много детей — обычное самоссылающееся дерево, никаких ограничений на уровень вложенности в схеме.

### B.2 Последовательность

Отдельная сущность "рёбер" — задача A предшествует задаче B. Не дерево (у шага процесса может быть несколько предшественников/преемников), не привязана к уровню иерархии.

```prisma
model JtbdSequenceEdge {
  id         String   @id @default(cuid())
  fromJtbdId String
  fromJtbd   JTBD     @relation("JtbdSequenceFrom", fields: [fromJtbdId], references: [id], onDelete: Cascade)
  toJtbdId   String
  toJtbd     JTBD     @relation("JtbdSequenceTo", fields: [toJtbdId], references: [id], onDelete: Cascade)
  createdAt  DateTime @default(now())

  @@unique([fromJtbdId, toJtbdId])
}
```

### B.3 Визуальный канвас

Узлы = задачи JTBD (сгруппированы визуально по категории/продукту), рёбра — двух видов:

- **иерархия** (`parent`/`children`) — например, пунктирная линия или вложенность
- **последовательность** (`JtbdSequenceEdge`) — сплошная линия со стрелкой в направлении процесса

**Библиотека:** [`@xyflow/react`](https://reactflow.dev/) (React Flow) — стандартный выбор для этой задачи в React-экосистеме, MIT-лицензия, TypeScript, поддерживает кастомные узлы, drag-and-drop, соединение рёбер "из коробки". Это единственная существенная новая зависимость во всём growth-плане — оправдана тем, что канвас с нуля переизобретать не имеет смысла, в отличие от остального UI платформы, написанного вручную.

**Функционал канваса:**

- Просмотр: все JTBD продукта как узлы, иерархия и последовательность как рёбра разных стилей
- Редактирование: перетащить узел под другого — меняет `parentId`; соединить два узла стрелкой — создаёт `JtbdSequenceEdge`
- Клик по узлу — переход на карточку JTBD (с сегментом/исследованием/гипотезами)
- Фильтр по категории, т.к. у продукта может быть много JTBD

Страница: `/jtbd/graph` (или `/products/[id]/jtbd-graph` в контексте продукта) — отдельная от обычного списка `/jtbd`, который остаётся как есть (группировка по категориям, % покрытия) для быстрого сканирования без визуальной сложности канваса.

---

## Фаза C: Инсайты и связность (доп. предложения)

Из вашего запроса "add other suggestions, keep the main purpose in mind" — ниже фичи, которые не запрашивались явно, но напрямую бьют в "connecting information → actionable insights". Приоритет ниже, чем у фаз A/B; можно перемешать порядок по факту.

- **Матрица "Сегменты × JTBD"** — кросс-таблица: какой сегмент какие задачи имеет и насколько это подтверждено исследованиями. Прямой ответ на "understand clients and their problems, segment them" в одном экране вместо перехода по карточкам.
- **Дашборд пробелов (gap analysis)** — автоматический, не ручной: JTBD без подтверждающего исследования, сегменты без единого JTBD, гипотезы, зависшие в "черновике", продукты без исследований за N дней. Это самый прямой способ дать "actionable insights" без всякого AI — просто запрос по уже обязательным связям.
- **Цитаты/выводы как отдельные записи.** Сейчас `Conversation` — один большой транскрипт, а у `Research` нет атомарных "Выводов". Вынесение цитат/инсайтов (короткий текст + источник + привязка к сегменту/JTBD) — то, что реально "соединяет" данные: одна цитата может подтверждать несколько JTBD, один вывод — относиться к нескольким сегментам.
- **Глобальный поиск** — при 8+ связанных модулях находить "то самое про возражения по цене" кликами по спискам перестаёт работать.
- **Авторизация/мультипользовательность** — не срочно, но конкурентная разведка и sales-kits — ровно тот контент, из-за которого общий seed-пользователь начинает ощущаться неправильным решением. Держать в поле зрения по мере роста.

---

## Порядок реализации

1. **Фаза A** — три новых модуля (`Competitor`, `ProductResource`, `Feature`+`RTB`), все по уже отработанному паттерну (Server Component + Server Action, как Segments/JTBD/Hypotheses/Conversations). Низкий риск, повторяет существующую архитектуру.
2. **Фаза B** — граф JTBD: сначала схема (`parentId` + `JtbdSequenceEdge`), затем канвас на React Flow. Более рискованная часть — первая новая зависимость и первый нетривиальный UI-компонент в проекте.
3. **Фаза C** — по одному пункту за раз, по мере необходимости; не требует новых архитектурных решений, использует то, что уже есть.

---

## Открытые вопросы на будущее (не блокируют старт)

- Feature ↔ RTB: точная семантика many-to-many устраивает, или RTB должен быть привязан к одной конкретной фиче?
- Нужен ли на канвасе JTBD отдельный "read-only" режим (например, для шаринга с не-PM), или редактирование всегда доступно всем, у кого есть доступ к платформе?
- Confluence/Jira: когда реальная интеграция станет актуальна — OAuth от лица пользователя или сервисный аккаунт на весь workspace?
