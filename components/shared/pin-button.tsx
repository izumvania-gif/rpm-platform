'use client'

import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'

// Иконочная кнопка: доступное имя и подсказка — из одной строки (фаза 27
// плана 2.4), чтобы они не разошлись; E2E accessibility.spec проверяет
// равенство на каждой такой кнопке.
export function PinButton({ pinned, action }: { pinned: boolean; action: () => void }) {
  const label = pinned ? 'Открепить' : 'Закрепить на дашборде'
  return (
    <form action={action} onClick={(e) => e.stopPropagation()}>
      <Tooltip content={label}>
        <Button type="submit" variant="outline" size="icon" aria-label={label}>
          <Star className={pinned ? 'fill-current' : ''} size={16} />
        </Button>
      </Tooltip>
    </form>
  )
}
