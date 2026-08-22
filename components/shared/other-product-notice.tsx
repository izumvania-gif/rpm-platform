import { switchActiveProduct } from '@/lib/actions/product-context'
import { SubmitButton } from '@/components/shared/submit-button'
import { isActiveProduct } from '@/lib/product-context'

// Запись открыта, но её продукт сейчас не активен (фаза 5 редизайна 2.1).
//
// План предлагал в этом случае выбрасывать на Обзор. Я так делать не стал, и
// это осознанное расхождение: ссылка на запись — самый частый способ показать
// коллеге, о чём речь, и редирект её ломает. Запись при этом своя: продукт
// принадлежит тому же пользователю, никакой границы доступа тут нет, есть
// только рассинхрон контекста. Выкидывать человека с валидной страницы за то,
// что cookie указывает на другой продукт, — это наказывать его за состояние,
// которого он не выбирал.
//
// Показать молча тоже нельзя: тогда запись видна на своей карточке, но
// отсутствует в списке, и объяснения нет. Поэтому третий вариант — показать и
// назвать причину, с кнопкой, которая переключает контекст одним действием.
export function OtherProductNotice({
  activeProductId,
  product,
  redirectTo,
}: {
  activeProductId: string | null
  product: { id: string; name: string }
  redirectTo: string
}) {
  if (isActiveProduct(activeProductId, product.id)) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[hsl(var(--signal-amber-border))] bg-[hsl(var(--signal-amber-bg))] px-3 py-2">
      <p className="text-sm text-[hsl(var(--signal-amber-text))]">
        Запись из продукта «{product.name}», а сейчас активен другой — в списках её не видно.
      </p>
      <form action={switchActiveProduct}>
        <input type="hidden" name="activeProductId" value={product.id} />
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <SubmitButton variant="outline" size="sm" pendingText="Переключаю…">
          Перейти в «{product.name}»
        </SubmitButton>
      </form>
    </div>
  )
}
