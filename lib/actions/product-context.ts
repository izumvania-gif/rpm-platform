'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getCurrentUserId } from '@/lib/current-user'
import { assertOwned } from '@/lib/ownership'
import { safeRedirectPath } from '@/lib/safe-redirect'
import { redirectAfterProductSwitch } from '@/lib/product-switch-redirect'
import { setActiveProductCookie } from '@/lib/product-context.server'

// Смена активного продукта.
//
// Server Action, а не запись cookie с клиента, по двум причинам. Первая:
// проверка владения — id приходит из формы, и без `assertOwned` любой id молча
// стал бы «активным продуктом». Вторая: после смены надо перерисовать страницу
// на сервере, а `document.cookie` с клиента этого не делает — списки остались
// бы прежними до перезагрузки.
/**
 * Сделать продукт активным, никуда не уводя.
 *
 * Нужен переключателям внутри витрин («Доставка», «Продажи»): они сами
 * решают, куда идти дальше, и редирект из действия им бы помешал. До фазы 13
 * эти переключатели помнили выбор в localStorage, отдельно от cookie, которым
 * живёт вся остальная платформа — то есть «какой продукт я веду» хранилось в
 * двух местах и эти места расходились.
 */
export async function selectActiveProduct(productId: string) {
  await assertOwned('product', productId, getCurrentUserId())
  setActiveProductCookie(productId)
  revalidatePath('/', 'layout')
}

export async function switchActiveProduct(formData: FormData) {
  const productId = String(formData.get('activeProductId') ?? '')
  await assertOwned('product', productId, getCurrentUserId())

  setActiveProductCookie(productId)

  // Всё, что фильтруется по активному продукту.
  revalidatePath('/', 'layout')

  // Возврат туда, откуда переключали: смена продукта — не навигация, человек
  // остаётся на том же экране, просто с другими данными. Путь приходит от
  // клиента, поэтому через тот же guard, что и остальные redirectTo.
  //
  // Исключение — карточка конкретной записи: она принадлежит прежнему
  // продукту, и оставить на ней значило бы показывать чужие данные под новой
  // подписью в шапке. Оттуда уходим в список раздела (фаза 13).
  //
  // Кроме случая, когда переключаются на продукт ЭТОЙ записи (`stay`): плашка
  // «запись из другого продукта» делает активным именно его, и уводить с
  // записи незачем — человек хотел остаться на ней и видеть её в списках
  // (фаза 20). Правило «с карточки — в список» остаётся у переключателя в
  // шапке, где новый продукт и продукт записи не совпадают.
  const path = safeRedirectPath(formData.get('redirectTo'), '/')
  const stay = formData.get('stay') === '1'
  redirect(stay ? path : redirectAfterProductSwitch(path, productId))
}
