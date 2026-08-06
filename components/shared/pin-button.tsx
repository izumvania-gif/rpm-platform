'use client'

import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PinButton({ pinned, action }: { pinned: boolean; action: () => void }) {
  return (
    <form action={action} onClick={(e) => e.stopPropagation()}>
      <Button
        type="submit"
        variant="outline"
        size="icon"
        aria-label={pinned ? 'Открепить' : 'Закрепить'}
        title={pinned ? 'Открепить' : 'Закрепить'}
      >
        <Star className={pinned ? 'fill-current' : ''} size={16} />
      </Button>
    </form>
  )
}
