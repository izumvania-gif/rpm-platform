import { PersonaStub } from '@/components/shared/persona-stub'

export default function SalesHubPage() {
  return (
    <PersonaStub
      title="Продажи"
      tagline="Быстрый доступ к sales-kit и материалам, и есть ли у продукта нужная клиенту фича."
      planned={[
        'Быстрый вход по продукту → sales-kit и материалы (ProductResource)',
        'Поиск «есть ли фича X» с тремя исходами: уже есть / запланировано / не найдено',
        'Точные даты не показываются продажникам напрямую — только качественный статус',
      ]}
    />
  )
}
