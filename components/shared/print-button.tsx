'use client'

import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'

const LABEL = 'Печать'

export function PrintButton() {
  return (
    <Tooltip content={LABEL}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={LABEL}
        onClick={() => window.print()}
      >
        <Printer size={16} />
      </Button>
    </Tooltip>
  )
}
