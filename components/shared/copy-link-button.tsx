'use client'

import { useState } from 'react'
import { Link2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'

const LABEL = 'Скопировать ссылку'

export function CopyLinkButton() {
  const [copied, setCopied] = useState(false)

  return (
    <Tooltip content={copied ? 'Скопировано' : LABEL}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={copied ? 'Скопировано' : LABEL}
        onClick={async () => {
          await navigator.clipboard.writeText(window.location.href)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
      >
        {copied ? <Check size={16} /> : <Link2 size={16} />}
      </Button>
    </Tooltip>
  )
}
