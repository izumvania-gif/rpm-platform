import Link from 'next/link'
import { TriangleAlert } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import type { ChainRow } from '@/lib/discovery-chain'

// Плашка слабого звена (фаза 10 редизайна 2.1).
//
// Тот же вывод, что раньше стоял сноской внизу карточки «Цепочка дискавери» —
// но вывод и есть главное на этом экране, а пять полосок под ним лишь
// показывают, откуда он взялся. Сноска под графиком читается последней; здесь
// она читается первой.
//
// Янтарная — по правилу цвета (фаза 1): это разрыв, а не действие. Янтарный
// только в рамке и заголовке, фон обычный: подписи идут `text-muted-foreground`,
// а этот токен считался под `--background` (то же решение, что в блоке «Что
// мешает», фаза 8).
//
// Пустое звено сюда не попадает никогда — за это отвечает `weakestStage`:
// «0 из 0» это то, к чему не приступали, а не порванная связь.
export function DashboardWeakLink({ weakest }: { weakest: ChainRow }) {
  const unattached = weakest.total - weakest.attached

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-lg border border-l-4 bg-card p-4"
      style={{ borderLeftColor: 'hsl(var(--signal-amber-border))' }}
    >
      <div className="flex min-w-0 items-start gap-2">
        <TriangleAlert
          size={16}
          aria-hidden
          className="mt-0.5 shrink-0 text-[hsl(var(--signal-amber-border))]"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold">Слабое звено — {weakest.label.toLowerCase()}</p>
          <p className="text-sm text-muted-foreground">
            {unattached} из {weakest.total} ни с чем не связаны. Связано, если {weakest.attachedTo}.
          </p>
        </div>
      </div>
      <Link href="/reports/gaps" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
        Что делать
      </Link>
    </div>
  )
}
