import type { EvidenceBalance } from '@/lib/hypothesis-readiness'

// Полоса баланса доказательств.
//
// Две доли одного целого, поэтому одна полоса, а не два столбика: вопрос здесь
// «чего больше», а не «сколько каждого». Между заливками зазор в 2px цветом
// фона — иначе на стыке зелёного и красного возникает третья, несуществующая
// граница.
//
// Цвет не единственный носитель смысла: обе стороны подписаны словом и числом.
// Красный у «против» — то же исключение, что у статуса «Опровергнута»
// (см. lib/labels.ts): это не индикатор разрыва и не кнопка, а сторона спора,
// и «нет» — ровно то, что красный значит культурно.
export function EvidenceBalanceBar({ balance }: { balance: EvidenceBalance }) {
  const voiced = balance.supports + balance.contradicts

  if (balance.total === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Ни одного доказательства не привязано — по этой гипотезе пока нечего взвешивать.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <span className="font-medium text-[hsl(var(--signal-green-text))]">
          За: {balance.supports}
        </span>
        <span className="font-medium text-[hsl(var(--signal-red-text))]">
          Против: {balance.contradicts}
        </span>
      </div>

      {voiced === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ни один из привязанных инсайтов не занял сторону.
        </p>
      ) : (
        <div
          className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label={`За: ${balance.supports}, против: ${balance.contradicts}`}
        >
          {balance.supports > 0 && (
            <div
              className="h-full"
              style={{
                width: `${balance.supportsPercent}%`,
                backgroundColor: 'hsl(var(--signal-green-border))',
              }}
            />
          )}
          {balance.supports > 0 && balance.contradicts > 0 && (
            <div className="h-full w-0.5 shrink-0 bg-background" />
          )}
          {balance.contradicts > 0 && (
            <div
              className="h-full flex-1"
              style={{ backgroundColor: 'hsl(var(--signal-red-border))' }}
            />
          )}
        </div>
      )}

      {balance.neutral > 0 && (
        <p className="text-xs text-muted-foreground">
          Ещё {balance.neutral} без стороны — в долях не учтены.
        </p>
      )}
    </div>
  )
}
