import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import type { Blocker } from '@/lib/record-blockers'

// Блок «Что мешает» (фаза 8 редизайна 2.1).
//
// Янтарный, а не красный: по правилу цвета (фаза 1) красный — это действие и
// активное состояние, янтарный — разрыв или то, что требует внимания. На
// экране, весь смысл которого показать проблему, красная плашка была бы
// неотличима от кнопки.
//
// Янтарный при этом только в рамке и заголовке, фон карточки обычный. Не из
// сдержанности: подписи внутри идут `text-muted-foreground`, а этот токен
// считался под `--background`, не под янтарную заливку. Залить фон значило бы
// поставить текст на поверхность, под которую его контраст никто не считал —
// ровно то, что фаза 1 запрещает делать на глаз. Левая рамка вместо заливки
// повторяет уже принятую в приложении идиому карточки (`border-l-4`), меняя
// красный на янтарный, и это и есть заявление: здесь не действие, здесь
// разрыв.
//
// Когда мешать нечему, блок не рисуется вовсе — ни зелёной плашки «всё
// хорошо», ни пустой карточки. Отсутствие проблемы это не новость, а
// нормальное состояние, и занимать под него экран не за что. (Чек-лист
// готовности гипотезы устроен иначе намеренно: там «2 из 4» — это счёт по
// заранее известному списку условий, и он обязан показывать выполненные тоже.)
export function RecordBlockers({ blockers }: { blockers: Blocker[] }) {
  if (blockers.length === 0) return null

  return (
    <section
      aria-labelledby="blockers-heading"
      className="rounded-lg border border-l-4 bg-card p-4"
      style={{ borderLeftColor: 'hsl(var(--signal-amber-border))' }}
    >
      <h2
        id="blockers-heading"
        className="mb-3 flex items-center gap-2 text-sm font-semibold"
        style={{ color: 'hsl(var(--signal-amber-text))' }}
      >
        <AlertTriangle size={15} aria-hidden />
        Что мешает
      </h2>
      <ul className="space-y-2">
        {blockers.map((blocker) => (
          <li key={blocker.key} className="flex flex-wrap items-start justify-between gap-2">
            <span className="min-w-0 flex-1 text-sm">
              <span className="font-medium">{blocker.label}</span>
              <span className="block text-xs text-muted-foreground">{blocker.hint}</span>
            </span>
            <Link
              href={blocker.actionHref}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              {blocker.actionLabel}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
