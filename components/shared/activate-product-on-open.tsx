'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { selectActiveProduct } from '@/lib/actions/product-context'

// Открыл карточку продукта — значит, ведёшь этот продукт (фаза 14).
//
// До этого переход `/cpo` → карточка продукта B → «Сегменты» приводил к
// сегментам продукта A: карточка показывала B, а cookie активного продукта
// по-прежнему держал A. Человек ушёл смотреть другой продукт, а платформа за
// ним не пошла. Для записей внутри продукта это правильно (там показывается
// плашка «запись из другого продукта» с кнопкой) — открыть чужую задачу по
// ссылке не значит сменить контекст. Но карточка самого продукта — это и
// есть выбор продукта; спрашивать подтверждения тут не за что.
//
// Server Component записать cookie не может, поэтому запись делает это
// действие с клиента и тут же перерисовывает страницу: списки в шапке и
// «недавно просмотренные» должны увидеть смену сразу, а не после следующего
// перехода. Срабатывает только при реальном расхождении — на своём продукте
// лишнего запроса нет.
export function ActivateProductOnOpen({
  productId,
  activeProductId,
}: {
  productId: string
  activeProductId: string | null
}) {
  const router = useRouter()
  const done = useRef(false)

  useEffect(() => {
    if (done.current || activeProductId === productId) return
    done.current = true
    void selectActiveProduct(productId).then(() => router.refresh())
  }, [productId, activeProductId, router])

  return null
}
