export interface WizardStep {
  key: string
  label: string
}

export const WIZARD_STEPS: WizardStep[] = [
  { key: 'segments', label: 'Сегменты' },
  { key: 'jtbd', label: 'JTBD' },
  { key: 'research', label: 'Исследования' },
  { key: 'hypotheses', label: 'Гипотезы' },
  { key: 'competitors', label: 'Конкуренты' },
  { key: 'features', label: 'Фичи и RTB' },
]
