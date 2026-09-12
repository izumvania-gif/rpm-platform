import Link from 'next/link'

// Хлебные крошки карточки (фаза 15, plans/2.2-usability-plan.md).
//
// До этого крошки рисовал только шаблон `RecordPage`, то есть пять карточек из
// двенадцати. У гипотезы, исследования, разговора, инсайта, продукта, человека и
// департамента пути наверх не было вовсе — только меню. Один компонент вместо
// разметки в каждом файле: крошки на всех карточках обязаны выглядеть одинаково,
// иначе разница читается как значащая.
//
// Крошки ведут в раздел, а не «назад»: кнопка «назад» — это история браузера, а
// раздел — это место. Ссылка «откуда пришли» для переходов не из списка (карточка
// JTBD, открытая с графа) — отдельный слот `contextLink` у `RecordPage`, он это
// не заменяет.
export interface Crumb {
  href: string
  label: string
}

export function RecordCrumbs({ items }: { items: Crumb[] }) {
  if (items.length === 0) return null

  return (
    <nav aria-label="Хлебные крошки" className="mb-2 text-xs text-muted-foreground">
      {items.map((item, i) => (
        <span key={item.href}>
          {i > 0 && (
            <span aria-hidden className="px-1.5">
              /
            </span>
          )}
          <Link href={item.href} className="hover:underline">
            {item.label}
          </Link>
        </span>
      ))}
    </nav>
  )
}
