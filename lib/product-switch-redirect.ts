// Куда возвращать человека после смены активного продукта (фаза 13).
//
// По умолчанию смена продукта — не навигация: человек остаётся на том же
// экране, просто с другими данными. Но ровно одно место это правило ломает —
// карточка конкретной записи. Запись принадлежит одному продукту, и после
// переключения шапка говорит «Рутокен MFA», а страница по-прежнему показывает
// JTBD от «Рутокен CLM». Приложение врёт о том, где находится пользователь.
//
// Поэтому с карточки записи возвращаемся в её список: он покажет записи уже
// нового продукта, и это единственный честный ответ на «я сменил продукт».
// Списки, отчёты и витрины остаются на месте — им смена продукта не вредит.
//
// Чистый модуль: проверяется юнит-тестами без браузера и без базы.

/** Разделы, у которых `/<раздел>/<id>` — карточка одной записи. */
const RECORD_SECTIONS = [
  'segments',
  'jtbd',
  'hypotheses',
  'features',
  'marketing',
  'competitors',
  'research',
  'conversations',
  'insights',
  'people',
  'departments',
] as const

/** Сегменты пути, которые не являются id записи. */
const NOT_AN_ID = ['new', 'graph']

export function redirectAfterProductSwitch(path: string, newProductId: string): string {
  const [, section, second] = path.split('?')[0].split('/')

  // Карточка продукта — единственный случай, где ответ не «список», а
  // «то же самое, но про новый продукт»: человек смотрел на продукт и хочет
  // смотреть на продукт.
  if (section === 'products' && second && !NOT_AN_ID.includes(second)) {
    return `/products/${newProductId}`
  }

  if (
    (RECORD_SECTIONS as readonly string[]).includes(section) &&
    second &&
    !NOT_AN_ID.includes(second)
  ) {
    return `/${section}`
  }

  return path
}
