import { PersonaStub } from '@/components/shared/persona-stub'

export default function PmViewPage() {
  return (
    <PersonaStub
      title="PM"
      tagline="Хаб на один продукт за раз: команда, роадмап, процесс, экшн-планы."
      planned={[
        'Переключатель между 3–4 продуктами PM',
        'Роадмап продукта по кварталам (Фаза 1)',
        'Командный дашборд / матрица делегирования (Фаза 2)',
        'Диаграмма процесса продукта + быстрые экшн-планы на нештатные ситуации (Фаза 3)',
      ]}
    />
  )
}
