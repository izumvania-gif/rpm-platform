import Link from 'next/link'
import { Check, Circle, Minus } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import type { Readiness, ReadinessKey } from '@/lib/hypothesis-readiness'

// Чек-лист готовности к решению — вместе с кнопками «что с этим делать».
//
// Каждая строка — факт, который либо есть, либо нет, и по которому видно, что
// делать. Никаких «на 60% готова»: доля от суммы разнородных условий —
// придуманное число, а «2 из 4» и список невыполненного — то, что было
// посчитано на самом деле.
//
// **Почему кнопки здесь, а не в отдельном блоке.** План (правка 4) описывал
// «Что можно сделать» отдельной карточкой под чек-листом. Сделал обе — и они
// оказались пересказом друг друга строка в строку: чек-лист говорит «Собрано
// хотя бы 3 доказательства / привязано 1 — нужно ещё 2», а блок под ним
// повторял ту же фразу и добавлял кнопку. Один и тот же текст дважды на
// расстоянии в полэкрана — это не два взгляда на проблему, это шум. Смысл
// правки 4 был в том, что подсказки детерминированные и не изображают вывод,
// а не в том, что они обязаны жить в своей карточке; поэтому кнопка встала в
// ту строку, к которой относится.
//
// Правило для цели кнопки: условие, закрывающееся на этой же странице, ведёт
// якорем к своей секции; условие, требующее другой страницы, — ссылкой туда.
const ACTION_LABELS: Record<ReadinessKey, string> = {
  criterion: 'К критерию',
  evidence: 'К доказательствам',
  addressee: 'Указать сегмент и задачу',
  feature: 'Связать с фичей',
}

export function ReadinessChecklist({
  readiness,
  hypothesisId,
  productId,
}: {
  readiness: Readiness
  hypothesisId: string
  productId: string
}) {
  const hrefs: Record<ReadinessKey, string> = {
    criterion: '#criterion',
    evidence: '#evidence',
    addressee: `/hypotheses/${hypothesisId}/edit`,
    // Матрица «Фичи × Гипотезы» (фаза 2) — там связь ставится одним кликом.
    feature: `/products/${productId}/links`,
  }

  return (
    <div className="space-y-3">
      <p className="text-sm">
        <span className="font-mono text-lg font-bold tabular-nums">
          {readiness.met} из {readiness.total}
        </span>{' '}
        <span className="text-muted-foreground">
          {readiness.ready
            ? '— всё на месте, гипотезу можно закрывать'
            : '— чего не хватает, чтобы закрыть гипотезу'}
        </span>
      </p>
      <ul className="space-y-1.5">
        {readiness.conditions.map((condition) => {
          // Три состояния, и у каждого своя иконка: неприменимое условие не
          // «провалено», и рисовать его пустым кружком значило бы показывать
          // требование, которого нет.
          const Icon = !condition.applicable ? Minus : condition.met ? Check : Circle
          const actionable = condition.applicable && !condition.met
          return (
            <li
              key={condition.key}
              className={
                'flex items-start gap-2 text-sm ' +
                (actionable ? 'rounded-md border p-2.5' : 'px-2.5 py-1')
              }
            >
              <Icon
                size={15}
                className={
                  'mt-0.5 shrink-0 ' +
                  (!condition.applicable
                    ? 'text-muted-foreground'
                    : condition.met
                      ? 'text-[hsl(var(--signal-green-border))]'
                      : 'text-[hsl(var(--signal-amber-border))]')
                }
                aria-hidden
              />
              <span
                className={
                  'min-w-0 flex-1 ' + (condition.applicable ? '' : 'text-muted-foreground')
                }
              >
                <span className={condition.met && condition.applicable ? '' : 'font-medium'}>
                  {condition.label}
                </span>
                {!condition.applicable && (
                  <span className="text-muted-foreground"> — не требуется для опровергнутой</span>
                )}
                {condition.hint && (
                  <span className="block text-xs text-muted-foreground">{condition.hint}</span>
                )}
              </span>
              {actionable && (
                <Link
                  href={hrefs[condition.key]}
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  {ACTION_LABELS[condition.key]}
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
