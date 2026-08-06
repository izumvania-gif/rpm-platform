'use client'

import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PrintButton() {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label="Печать"
      title="Печать"
      onClick={() => window.print()}
    >
      <Printer size={16} />
    </Button>
  )
}
