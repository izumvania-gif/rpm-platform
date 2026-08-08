import { PersonaStub } from '@/components/shared/persona-stub'

export default function MarketingHubPage() {
  return (
    <PersonaStub
      title="Маркетинг"
      tagline="Что можно рассказать о продукте — и каким сегментам — на основе уже собранных данных."
      planned={[
        'Фильтр по сегменту → подтверждённые JTBD → закрывающие их фичи → опирающиеся RTB',
        'Лента «скоро» — пункты роадмапа со статусом «в работе»/«запланировано»',
      ]}
    />
  )
}
